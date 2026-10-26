"""Rule registry and cross-file analysis for ComposeEnvGuard.

Every rule ID has exactly one :class:`RuleSpec`. Parsers emit findings for
syntax-level problems through :func:`make_finding`; :func:`analyze_project`
produces the cross-file findings (CEG001 to CEG007).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from .models import Finding, RuleSpec, Severity

if TYPE_CHECKING:  # pragma: no cover - typing only, avoids a runtime import cycle
    from .scanner import ScanContext

RULES: tuple[RuleSpec, ...] = (
    RuleSpec(
        id="CEG001",
        title="Undocumented interpolation reference",
        default_severity=Severity.WARNING,
        detects=(
            "A Compose value references a variable (${VAR} or $VAR) that is not documented "
            "in the selected environment template."
        ),
        does_not_detect=(
            "Whether the variable is actually unset at runtime. It may be supplied by the "
            "shell, CI secrets, or an unread .env file."
        ),
    ),
    RuleSpec(
        id="CEG002",
        title="Duplicate template variable",
        default_severity=Severity.WARNING,
        detects="The same variable name is declared more than once in the environment template.",
        does_not_detect="Which value a dotenv loader will use at runtime.",
    ),
    RuleSpec(
        id="CEG003",
        title="Missing required env_file",
        default_severity=Severity.ERROR,
        detects=(
            "A service env_file entry points to a path that does not exist and is required "
            "(the Compose default when 'required' is not set to false)."
        ),
        does_not_detect="Whether an existing env_file has valid contents.",
    ),
    RuleSpec(
        id="CEG004",
        title="Potentially unused documented variable",
        default_severity=Severity.INFO,
        detects=(
            "A template variable is not referenced by Compose interpolation, service "
            "environment entries, or a read env_file."
        ),
        does_not_detect=("Whether application code reads the variable directly, which is common and valid."),
    ),
    RuleSpec(
        id="CEG005",
        title="Invalid or unsupported configuration",
        default_severity=Severity.ERROR,
        detects=(
            "Malformed YAML or dotenv syntax, unsupported Compose constructs, invalid "
            "interpolation, undecodable, oversized, or out-of-boundary files."
        ),
        does_not_detect="Full validation against the Compose specification schema.",
    ),
    RuleSpec(
        id="CEG006",
        title="Explicit service contract mismatch",
        default_severity=Severity.ERROR,
        detects=(
            "A variable listed in a .composeguard.yaml service contract is not declared through "
            "the service environment or env_file, or the service is not defined."
        ),
        does_not_detect="Any requirement that is not written in an explicit contract.",
    ),
    RuleSpec(
        id="CEG007",
        title="Unverified private environment file",
        default_severity=Severity.INFO,
        detects=(
            "An environment file exists but was not read under the default privacy policy, so "
            "its variable names could not be verified."
        ),
        does_not_detect="The names or values inside the file.",
    ),
    RuleSpec(
        id="CEG008",
        title="Suspicious environment mapping",
        default_severity=Severity.WARNING,
        detects=(
            "Empty or invalid variable names, non-scalar values, malformed list entries, or a "
            "name defined twice in one service environment."
        ),
        does_not_detect="Whether the values are correct for the application.",
    ),
)

_BY_ID = {rule.id: rule for rule in RULES}

# env_file states whose content could not be inspected, so declarations are unknown.
UNVERIFIED_STATUSES = frozenset({"not_read", "not_supplied", "outside", "interpolated"})


def rule_spec(rule_id: str) -> RuleSpec:
    return _BY_ID[rule_id]


def known_rule_ids() -> frozenset[str]:
    return frozenset(_BY_ID)


def make_finding(
    rule_id: str,
    message: str,
    suggestion: str,
    *,
    severity: Severity | None = None,
    variable: str | None = None,
    service: str | None = None,
    file: str | None = None,
    line: int | None = None,
    subject: str | None = None,
    uncertainty: str | None = None,
) -> Finding:
    spec = _BY_ID[rule_id]
    return Finding(
        rule_id=rule_id,
        severity=severity or spec.default_severity,
        title=spec.title,
        message=message,
        suggestion=suggestion,
        variable=variable,
        service=service,
        file=file,
        line=line,
        subject=subject,
        uncertainty=uncertainty,
    )


def analyze_project(ctx: ScanContext) -> list[Finding]:
    """Cross-file rules that need the full picture (CEG001, CEG002, CEG003, CEG004, CEG006, CEG007)."""
    findings: list[Finding] = []
    findings.extend(_check_duplicate_template_keys(ctx))
    findings.extend(_check_undocumented_references(ctx))
    findings.extend(_check_env_files(ctx))
    findings.extend(_check_unused_template_variables(ctx))
    findings.extend(_check_service_contracts(ctx))
    findings.extend(_check_private_files(ctx))
    return findings


def _check_duplicate_template_keys(ctx: ScanContext) -> list[Finding]:
    if ctx.template is None:
        return []
    findings: list[Finding] = []
    first_seen: dict[str, int] = {}
    for key in ctx.template.keys:
        if key.name in first_seen:
            findings.append(
                make_finding(
                    "CEG002",
                    f"{key.name} is declared more than once in {ctx.template.path} "
                    f"(first at line {first_seen[key.name]}).",
                    "Keep a single declaration for each variable in the template.",
                    variable=key.name,
                    file=ctx.template.path,
                    line=key.line,
                )
            )
        else:
            first_seen[key.name] = key.line
    return findings


def _check_undocumented_references(ctx: ScanContext) -> list[Finding]:
    if ctx.template is None:
        return []
    documented = ctx.template.names
    grouped: dict[str, list] = {}
    for occurrence in ctx.references:
        if occurrence.ref.name in documented or occurrence.ref.name in ctx.config.external_variables:
            continue
        grouped.setdefault(occurrence.ref.name, []).append(occurrence)

    findings: list[Finding] = []
    for name in sorted(grouped):
        occurrences = sorted(grouped[name], key=lambda o: (o.file, o.line, o.service or ""))
        first = occurrences[0]
        services = sorted({o.service for o in occurrences if o.service})
        where = f" (service: {', '.join(services)})" if services else ""
        notes: list[str] = []
        if any(o.ref.has_default for o in occurrences):
            notes.append("Compose falls back to a default value when it is unset.")
        if any(o.ref.is_required for o in occurrences):
            notes.append("Compose aborts when it is unset, which is only a problem if nothing supplies it.")
        notes.append(
            "It may be supplied by the shell, CI secrets, or an environment file that was not read; "
            "this does not prove it is missing at runtime."
        )
        if ctx.unread_private_files:
            notes.append(
                "Unread private files that may define it: " + ", ".join(ctx.unread_private_files[:5]) + "."
            )
        findings.append(
            make_finding(
                "CEG001",
                f"Referenced in {first.file} but not documented in {ctx.template.path}{where}.",
                f"Document {name} in {ctx.template.path}, or list it under "
                "external_variables in .composeguard.yaml if it is supplied externally.",
                variable=name,
                service=services[0] if services else None,
                file=first.file,
                line=first.line,
                uncertainty=" ".join(notes),
            )
        )
    return findings


def _check_env_files(ctx: ScanContext) -> list[Finding]:
    findings: list[Finding] = []
    for env_file in sorted(ctx.env_files.values(), key=lambda e: e.path):
        if env_file.status != "missing" or not env_file.required:
            continue
        if not ctx.verify_existence:
            continue
        services = sorted(env_file.services)
        findings.append(
            make_finding(
                "CEG003",
                f"The {', '.join(services) or 'a'} service references a required environment file "
                f"that does not exist: {env_file.path}.",
                "Create the expected file, correct its path, or mark it 'required: false' "
                "when it is optional.",
                service=services[0] if services else None,
                file=env_file.declared_in,
                line=env_file.line,
                subject=env_file.path,
            )
        )
    return findings


def _check_unused_template_variables(ctx: ScanContext) -> list[Finding]:
    if ctx.template is None:
        return []
    observed = ctx.observed_names()
    uncertainty = None
    unverified = [e.path for e in ctx.env_files.values() if e.status in UNVERIFIED_STATUSES]
    if unverified:
        uncertainty = (
            "A referenced environment file was not read, so it may declare this variable: "
            + ", ".join(sorted(unverified)[:5])
            + ". Application code may also read it directly."
        )
    else:
        uncertainty = "Application code may still read it directly."
    findings: list[Finding] = []
    seen: set[str] = set()
    for key in ctx.template.keys:
        if key.name in observed or key.name in seen:
            continue
        seen.add(key.name)
        findings.append(
            make_finding(
                "CEG004",
                f"Documented in {ctx.template.path} but not referenced in the analyzed Compose files.",
                "Check whether the application still needs this variable and remove it from the "
                "template if not.",
                variable=key.name,
                file=ctx.template.path,
                line=key.line,
                uncertainty=uncertainty,
            )
        )
    return findings


def _check_service_contracts(ctx: ScanContext) -> list[Finding]:
    findings: list[Finding] = []
    defined = ctx.service_names()
    for service_name in sorted(ctx.config.services):
        contract = ctx.config.services[service_name]
        if service_name not in defined:
            findings.append(
                make_finding(
                    "CEG006",
                    f"Contract service '{service_name}' is not defined in the analyzed Compose files.",
                    "Correct the service name in .composeguard.yaml or analyze the file that defines it.",
                    service=service_name,
                    file=ctx.config_path,
                    subject=service_name,
                )
            )
            continue
        declared = ctx.declared_env_names(service_name)
        unverified = ctx.unverified_env_files_for(service_name)  # paths of unreadable env_files
        for var in sorted(set(contract.required_env)):
            if var in declared:
                continue
            if unverified:
                findings.append(
                    make_finding(
                        "CEG006",
                        f"Required variable {var} is not declared in the analyzed service "
                        f"environment, and an env_file could not be read to verify it.",
                        f"Declare {var} under environment or add it to a readable env_file.",
                        severity=Severity.WARNING,
                        variable=var,
                        service=service_name,
                        file=ctx.config_path,
                        uncertainty="Unread env_file(s): " + ", ".join(unverified[:5]) + ".",
                    )
                )
            else:
                findings.append(
                    make_finding(
                        "CEG006",
                        f"Service {service_name} requires {var}, but it is not declared through "
                        "environment or env_file.",
                        f"Add {var} to the environment of {service_name} or to one of its env_file entries.",
                        variable=var,
                        service=service_name,
                        file=ctx.config_path,
                    )
                )
    return findings


def _check_private_files(ctx: ScanContext) -> list[Finding]:
    findings: list[Finding] = []
    for path in sorted(ctx.private_files):
        info = ctx.private_files[path]
        if info.reason == "not_supplied":
            message = (
                f"Environment file {path} is referenced by {', '.join(sorted(info.services))} but "
                "was not included in this scan, so its existence and variable names could not be verified."
            )
            suggestion = "Include the file in the scan input, or document the variables in the template."
        elif info.reason == "env_file":
            services = ", ".join(sorted(info.services))
            where = f" referenced by {services}" if services else ""
            message = (
                f"Environment file {path}{where} exists but was not read under the default "
                "privacy policy, so its variable names could not be verified."
            )
            suggestion = (
                f"Pass --include-env-file {path} to verify variable names locally, or document "
                "the variables in the template."
            )
        else:
            message = (
                f"{path} exists and Compose reads it for interpolation, but it was not read "
                "under the default privacy policy, so its variable names could not be verified."
            )
            suggestion = f"Pass --include-env-file {path} to verify variable names locally."
        findings.append(
            make_finding(
                "CEG007",
                message,
                suggestion,
                file=path,
                subject=path,
            )
        )
    return findings
