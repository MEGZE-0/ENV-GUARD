"""The scanning engine. The CLI and the HTTP API both call :func:`scan_project`.

Pipeline:
1. Load the optional ``.composeguard.yaml`` contract/configuration.
2. Select and parse Compose files (each analyzed on its own, see docs/limitations.md).
3. Select and parse the environment template (names only).
4. Resolve ``env_file`` references inside the project boundary and apply the
   privacy policy: only templates and explicitly included files are read.
5. Run the cross-file rules, apply configuration, sort, de-duplicate and summarise.

Nothing here executes code, starts containers, writes files, or expands values.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from . import __version__
from .compose_parser import ComposeFacts, RefOccurrence, parse_compose
from .dotenv_parser import DotenvDocument, DotenvKey, parse_dotenv
from .interpolation import contains_interpolation
from .models import (
    AnalyzedFile,
    FailOn,
    Finding,
    FindingCounts,
    Report,
    Severity,
    SkippedItem,
    ToolInfo,
)
from .rules import UNVERIFIED_STATUSES, analyze_project, known_rule_ids, make_finding
from .security import (
    COMPOSE_NAMES,
    CONFIG_NAMES,
    MAX_COMPOSE_FILE_BYTES,
    MAX_COMPOSE_FILES,
    MAX_CONFIG_FILE_BYTES,
    MAX_ENV_FILE_BYTES,
    PRIVATE_DEFAULT_NAMES,
    TEMPLATE_NAMES,
    VALID_VARIABLE_NAME,
    ProjectPathError,
    ProjectRoot,
    ScanInputError,
    is_within,
)

COMPOSE_OVERRIDE_NAMES = (
    "compose.override.yaml",
    "compose.override.yml",
    "docker-compose.override.yml",
    "docker-compose.override.yaml",
)


# -- configuration ----------------------------------------------------------------


class ServiceContract(BaseModel):
    model_config = ConfigDict(extra="forbid")

    required_env: list[str] = Field(default_factory=list)

    @field_validator("required_env")
    @classmethod
    def _names(cls, value: list[str]) -> list[str]:
        for name in value:
            if not VALID_VARIABLE_NAME.match(name):
                raise ValueError("invalid variable name in required_env")
        return value


class ComposeGuardConfig(BaseModel):
    """Contents of an optional ``.composeguard.yaml`` file."""

    model_config = ConfigDict(extra="forbid")

    version: int = 1
    disabled_rules: list[str] = Field(default_factory=list)
    severity_overrides: dict[str, Severity] = Field(default_factory=dict)
    external_variables: list[str] = Field(default_factory=list)
    services: dict[str, ServiceContract] = Field(default_factory=dict)

    @field_validator("version")
    @classmethod
    def _version(cls, value: int) -> int:
        if value != 1:
            raise ValueError("unsupported configuration version")
        return value

    @field_validator("disabled_rules")
    @classmethod
    def _disabled(cls, value: list[str]) -> list[str]:
        unknown = sorted(set(value) - known_rule_ids())
        if unknown:
            raise ValueError("unknown rule id in disabled_rules")
        return value

    @field_validator("severity_overrides")
    @classmethod
    def _overrides(cls, value: dict[str, Severity]) -> dict[str, Severity]:
        if set(value) - known_rule_ids():
            raise ValueError("unknown rule id in severity_overrides")
        return value

    @field_validator("external_variables")
    @classmethod
    def _external(cls, value: list[str]) -> list[str]:
        for name in value:
            if not VALID_VARIABLE_NAME.match(name):
                raise ValueError("invalid variable name in external_variables")
        return value


def _load_config(boundary: ProjectRoot, rel: str | None) -> tuple[ComposeGuardConfig, str | None]:
    if rel is None:
        return ComposeGuardConfig(), None
    try:
        text = boundary.read_text(rel, MAX_CONFIG_FILE_BYTES)
    except ProjectPathError as exc:
        raise ScanInputError(f"Configuration file {rel} could not be read: {exc}.") from exc
    try:
        data: Any = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        where = f" at line {mark.line + 1}" if mark is not None else ""
        raise ScanInputError(f"Configuration file {rel} is not valid YAML{where}.") from None
    if data is None:
        data = {}
    if not isinstance(data, dict):
        raise ScanInputError(f"Configuration file {rel} must contain a mapping at the top level.")
    try:
        return ComposeGuardConfig.model_validate(data), rel
    except ValidationError as exc:
        problems = "; ".join(
            f"{'.'.join(str(p) for p in err['loc']) or 'root'}: {err['msg']}" for err in exc.errors()
        )
        raise ScanInputError(f"Configuration file {rel} is invalid: {problems}.") from None


# -- scan options and internal state ------------------------------------------------


@dataclass
class ScanOptions:
    """Inputs for a scan. Defaults match the CLI behaviour."""

    compose_files: list[str] = field(default_factory=list)
    env_example: str | None = None
    include_env_files: list[str] = field(default_factory=list)
    config_path: str | None = None
    fail_on: FailOn = FailOn.ERROR
    project_name: str | None = None
    verify_existence: bool = True
    max_compose_bytes: int = MAX_COMPOSE_FILE_BYTES
    max_env_bytes: int = MAX_ENV_FILE_BYTES


@dataclass
class TemplateState:
    path: str
    keys: list[DotenvKey]

    @property
    def names(self) -> set[str]:
        return {key.name for key in self.keys}


@dataclass
class EnvFileState:
    path: str  # display path: project-relative, or the raw declared path when not inspectable
    declared_in: str
    line: int
    required: bool = False
    services: set[str] = field(default_factory=set)
    status: str = "missing"  # read | missing | not_read | not_supplied | outside | interpolated
    keys: set[str] = field(default_factory=set)


@dataclass
class PrivateFileInfo:
    reason: str  # env_file | project_env | not_supplied
    services: set[str] = field(default_factory=set)


@dataclass
class ScanContext:
    project: str
    config: ComposeGuardConfig
    config_path: str | None
    verify_existence: bool
    compose: list[ComposeFacts] = field(default_factory=list)
    template: TemplateState | None = None
    references: list[RefOccurrence] = field(default_factory=list)
    env_files: dict[str, EnvFileState] = field(default_factory=dict)
    private_files: dict[str, PrivateFileInfo] = field(default_factory=dict)

    def service_names(self) -> set[str]:
        return {name for facts in self.compose for name in facts.services}

    def declared_env_names(self, service: str) -> set[str]:
        names: set[str] = set()
        for facts in self.compose:
            if service in facts.services:
                names.update(facts.services[service].environment)
        for state in self.env_files.values():
            if service in state.services and state.status == "read":
                names.update(state.keys)
        return names

    def unverified_env_files_for(self, service: str) -> list[str]:
        return sorted(
            state.path
            for state in self.env_files.values()
            if service in state.services and state.status in UNVERIFIED_STATUSES
        )

    def observed_names(self) -> set[str]:
        observed = {occ.ref.name for occ in self.references}
        for facts in self.compose:
            for service in facts.services.values():
                observed.update(service.environment)
        for state in self.env_files.values():
            if state.services and state.status == "read":
                observed.update(state.keys)
        return observed

    @property
    def unread_private_files(self) -> list[str]:
        return sorted(self.private_files)


# -- public entry point ----------------------------------------------------------------


def scan_project(project_dir: str | Path, options: ScanOptions | None = None) -> Report:
    """Scan ``project_dir`` and return a :class:`Report`.

    Raises :class:`ScanInputError` when the input cannot be analyzed reliably.
    """
    options = options or ScanOptions()
    project_path = Path(project_dir)
    boundary = ProjectRoot(project_path)
    project_name = options.project_name or project_path.resolve().name or "project"

    files: list[AnalyzedFile] = []
    skipped: list[SkippedItem] = []
    notes: list[str] = []
    findings: list[Finding] = []

    # 1. Configuration -----------------------------------------------------------
    config_rel = options.config_path
    if config_rel is not None:
        if not _exists(boundary, config_rel):
            raise ScanInputError(f"Configuration file not found: {config_rel}")
    else:
        config_rel = _first_existing(boundary, CONFIG_NAMES)
    config, config_path = _load_config(boundary, config_rel)
    if config_path:
        files.append(AnalyzedFile(path=config_path, role="config", status="analyzed"))

    ctx = ScanContext(
        project=project_name,
        config=config,
        config_path=config_path,
        verify_existence=options.verify_existence,
    )

    # 2. Compose files -------------------------------------------------------------
    compose_rels = _select_compose_files(boundary, options.compose_files, skipped)
    for rel in compose_rels:
        files.append(AnalyzedFile(path=rel, role="compose", status="analyzed"))
        try:
            text = boundary.read_text(rel, options.max_compose_bytes)
        except ProjectPathError as exc:
            files[-1] = AnalyzedFile(path=rel, role="compose", status="skipped")
            skipped.append(SkippedItem(path=rel, reason=f"Compose file not analyzed: {exc}."))
            findings.append(
                make_finding(
                    "CEG005",
                    f"{rel} could not be read and was not analyzed: {exc}.",
                    "Fix the file, reduce its size, or remove it from the scan.",
                    file=rel,
                )
            )
            continue
        facts = parse_compose(text, rel)
        ctx.compose.append(facts)
        ctx.references.extend(facts.references)
        findings.extend(facts.findings)
    if not ctx.compose:
        reasons = " ".join(s.reason for s in skipped if s.path in compose_rels)
        raise ScanInputError(f"No Compose file could be analyzed. {reasons}".strip())
    if options.compose_files == [] and _first_existing(boundary, COMPOSE_OVERRIDE_NAMES):
        override = _first_existing(boundary, COMPOSE_OVERRIDE_NAMES)
        skipped.append(
            SkippedItem(
                path=override,
                reason=(
                    "Compose override file found but not analyzed. Pass every file explicitly "
                    "with --compose to include it."
                ),
            )
        )

    # 3. Environment template ------------------------------------------------------
    template_rel = options.env_example
    if template_rel is not None:
        if not _exists(boundary, template_rel):
            raise ScanInputError(f"Environment template not found: {template_rel}")
    else:
        template_rel = _first_existing(boundary, TEMPLATE_NAMES)
    if template_rel is None:
        notes.append(
            "No environment template was found (looked for .env.example and .env.sample). "
            "CEG001, CEG002 and CEG004 were not run. Pass --env-example to choose one."
        )
    else:
        _load_template(boundary, template_rel, options, ctx, files, skipped, findings)

    if template_rel is not None and ctx.template is None:
        notes.append(
            "The environment template could not be analyzed; CEG001, CEG002 and CEG004 were not run."
        )

    # 4. Included (explicitly opted-in) env files -----------------------------------
    included: dict[str, set[str]] = {}
    for raw in options.include_env_files:
        rel = _checked_rel(boundary, raw, "included env file")
        if not _exists(boundary, rel):
            raise ScanInputError(f"Included environment file not found: {raw}")
        keys = _read_env_keys(boundary, rel, options.max_env_bytes, findings, files, "included_env_file")
        included[rel] = keys

    # 5. env_file references and privacy policy ----------------------------------
    _resolve_env_files(boundary, ctx, included, options, files, findings)

    # 6. Project-level .env (read by Compose for interpolation) ---------------------
    for name in PRIVATE_DEFAULT_NAMES:
        inside, exists = boundary.exists(name)
        if inside and exists and name not in included and name not in ctx.env_files:
            ctx.private_files[name] = PrivateFileInfo(reason="project_env")
            files.append(AnalyzedFile(path=name, role="project_env", status="not_read"))

    # 7. Rules -----------------------------------------------------------------------
    findings.extend(analyze_project(ctx))
    findings = _apply_configuration(findings, config)
    findings = _finalize(findings)

    # 8. Report ---------------------------------------------------------------------
    services = sorted(ctx.service_names())
    counts = _count(findings)
    failed = any(options.fail_on.triggers(f.severity) for f in findings)
    return Report(
        tool=ToolInfo(version=__version__),
        project=project_name,
        status="failed" if failed else "passed",
        fail_on=options.fail_on,
        counts=counts,
        files=_sorted_files(files),
        services=services,
        findings=findings,
        skipped=sorted(skipped, key=lambda s: (s.path or "", s.reason)),
        notes=notes,
    )


# -- helpers ------------------------------------------------------------------------------


def _exists(boundary: ProjectRoot, rel: str) -> bool:
    try:
        return boundary.exists(rel)[1]
    except ProjectPathError:
        return False


def _first_existing(boundary: ProjectRoot, names: tuple[str, ...]) -> str | None:
    for name in names:
        if _exists(boundary, name):
            return name
    return None


def _checked_rel(boundary: ProjectRoot, raw: str, what: str) -> str:
    """Resolve a path given on the command line or in the configuration file.

    Absolute paths are accepted only when they point inside the project. Paths inside
    Compose files go through ``ProjectRoot.resolve`` directly and never accept absolute paths.
    """
    candidate = raw
    if raw and "\x00" not in raw and os.path.isabs(raw):
        real = os.path.realpath(raw)
        if is_within(real, boundary.real_root):
            candidate = os.path.relpath(real, boundary.real_root).replace(os.sep, "/")
    rel, _real = boundary.resolve(candidate)
    if rel is None:
        raise ScanInputError(f"The {what} must be inside the project directory: {raw}")
    return rel


def _select_compose_files(
    boundary: ProjectRoot, explicit: list[str], skipped: list[SkippedItem]
) -> list[str]:
    if explicit:
        if len(explicit) > MAX_COMPOSE_FILES:
            raise ScanInputError(f"Too many Compose files (limit is {MAX_COMPOSE_FILES}).")
        rels: list[str] = []
        for raw in explicit:
            rel = _checked_rel(boundary, raw, "Compose file")
            if not rel.endswith((".yaml", ".yml")):
                raise ScanInputError(f"Compose files must end in .yaml or .yml: {raw}")
            if not _exists(boundary, rel):
                raise ScanInputError(f"Compose file not found: {raw}")
            if rel not in rels:
                rels.append(rel)
        return rels
    found = _first_existing(boundary, COMPOSE_NAMES)
    if found is None:
        raise ScanInputError(
            "No Compose file found. Looked for "
            + ", ".join(COMPOSE_NAMES)
            + ". Pass --compose PATH to analyze a file with another name, or run the scan "
            "in the directory that contains your Compose file."
        )
    return [found]


def _load_template(
    boundary: ProjectRoot,
    rel: str,
    options: ScanOptions,
    ctx: ScanContext,
    files: list[AnalyzedFile],
    skipped: list[SkippedItem],
    findings: list[Finding],
) -> None:
    try:
        text = boundary.read_text(rel, options.max_env_bytes)
    except ProjectPathError as exc:
        findings.append(
            make_finding(
                "CEG005",
                f"The environment template {rel} could not be read: {exc}.",
                "Fix or replace the template so that variables can be checked against it.",
                file=rel,
            )
        )
        files.append(AnalyzedFile(path=rel, role="template", status="skipped"))
        return
    doc: DotenvDocument = parse_dotenv(text)
    for problem in doc.problems:
        if problem.kind == "empty_name":
            findings.append(
                make_finding(
                    "CEG008",
                    f"{rel} has a line with an empty variable name.",
                    "Remove the line or add a variable name before the '='.",
                    severity=Severity.ERROR,
                    file=rel,
                    line=problem.line,
                )
            )
        elif problem.kind == "invalid_name":
            findings.append(
                make_finding(
                    "CEG008",
                    f"{rel} has a variable name that is not a valid identifier.",
                    "Use letters, digits and underscores, starting with a letter or underscore.",
                    file=rel,
                    line=problem.line,
                )
            )
        else:
            findings.append(
                make_finding(
                    "CEG005",
                    f"{rel} has a line that is not valid dotenv syntax; it was ignored.",
                    "Use NAME=value lines, comments starting with '#', and blank lines.",
                    severity=Severity.WARNING,
                    file=rel,
                    line=problem.line,
                )
            )
    ctx.template = TemplateState(path=rel, keys=doc.keys)
    files.append(AnalyzedFile(path=rel, role="template", status="analyzed"))


def _read_env_keys(
    boundary: ProjectRoot,
    rel: str,
    max_bytes: int,
    findings: list[Finding],
    files: list[AnalyzedFile],
    role: str,
) -> set[str]:
    try:
        text = boundary.read_text(rel, max_bytes)
    except ProjectPathError as exc:
        findings.append(
            make_finding(
                "CEG005",
                f"Environment file {rel} could not be read: {exc}.",
                "Fix the file or exclude it from the analysis.",
                severity=Severity.WARNING,
                file=rel,
            )
        )
        files.append(AnalyzedFile(path=rel, role=role, status="skipped"))  # type: ignore[arg-type]
        return set()
    doc = parse_dotenv(text)
    for problem in doc.problems:
        findings.append(
            make_finding(
                "CEG005",
                f"{rel} has a line that is not valid dotenv syntax; it was ignored.",
                "Use NAME=value lines, comments starting with '#', and blank lines.",
                severity=Severity.WARNING,
                file=rel,
                line=problem.line,
            )
        )
    files.append(AnalyzedFile(path=rel, role=role, status="keys_read"))  # type: ignore[arg-type]
    return doc.names


def _resolve_env_files(
    boundary: ProjectRoot,
    ctx: ScanContext,
    included: dict[str, set[str]],
    options: ScanOptions,
    files: list[AnalyzedFile],
    findings: list[Finding],
) -> None:
    reported_positions: set[tuple[str, int]] = set()
    for facts in ctx.compose:
        base_dir = os.path.dirname(facts.path) or "."
        for service in facts.services.values():
            for entry in service.env_files:
                position = (facts.path, entry.line)
                if contains_interpolation(entry.path):
                    key = f"{entry.path} (declared in {facts.path})"
                    state = ctx.env_files.setdefault(
                        key,
                        EnvFileState(path=entry.path, declared_in=facts.path, line=entry.line),
                    )
                    state.status = "interpolated"
                    state.required = state.required or entry.required
                    state.services.add(service.name)
                    if position not in reported_positions:
                        reported_positions.add(position)
                        findings.append(
                            make_finding(
                                "CEG005",
                                f"The env_file path in {facts.path} uses interpolation, so it cannot be "
                                "resolved without running Compose; it was not verified.",
                                "Use a literal path if you want ComposeEnvGuard to verify it.",
                                severity=Severity.INFO,
                                service=service.name,
                                file=facts.path,
                                line=entry.line,
                            )
                        )
                    continue
                rel, _real = boundary.resolve(entry.path, base_dir)
                if rel is None:
                    key = f"{entry.path} (declared in {facts.path})"
                    state = ctx.env_files.setdefault(
                        key,
                        EnvFileState(path=entry.path, declared_in=facts.path, line=entry.line),
                    )
                    state.status = "outside"
                    state.required = state.required or entry.required
                    state.services.add(service.name)
                    if position not in reported_positions:
                        reported_positions.add(position)
                        findings.append(
                            make_finding(
                                "CEG005",
                                f"The env_file path in {facts.path} resolves outside the project directory "
                                "and was not inspected.",
                                "Keep env files inside the project, or scan the directory holding them.",
                                severity=Severity.WARNING,
                                service=service.name,
                                file=facts.path,
                                line=entry.line,
                            )
                        )
                    continue
                state = ctx.env_files.get(rel)
                if state is None:
                    state = EnvFileState(path=rel, declared_in=facts.path, line=entry.line)
                    ctx.env_files[rel] = state
                state.required = state.required or entry.required
                state.services.add(service.name)

    for rel in sorted(ctx.env_files):
        state = ctx.env_files[rel]
        if state.status in UNVERIFIED_STATUSES:
            if state.status == "outside":
                files.append(AnalyzedFile(path=state.path, role="env_file", status="skipped"))
            continue
        exists = _exists(boundary, rel)
        if not exists:
            if not options.verify_existence:
                state.status = "not_supplied"
                ctx.private_files[rel] = PrivateFileInfo("not_supplied", set(state.services))
                files.append(AnalyzedFile(path=rel, role="env_file", status="not_read"))
            else:
                state.status = "missing"
                files.append(AnalyzedFile(path=rel, role="env_file", status="missing"))
            continue
        if rel in included:
            state.status = "read"
            state.keys = included[rel]
            continue
        if _is_template_name(rel):
            state.keys = _read_env_keys(boundary, rel, options.max_env_bytes, findings, files, "env_file")
            state.status = "read"
            continue
        state.status = "not_read"
        ctx.private_files[rel] = PrivateFileInfo("env_file", set(state.services))
        files.append(AnalyzedFile(path=rel, role="env_file", status="not_read"))


def _is_template_name(rel: str) -> bool:
    return os.path.basename(rel) in TEMPLATE_NAMES


def _apply_configuration(findings: list[Finding], config: ComposeGuardConfig) -> list[Finding]:
    result: list[Finding] = []
    disabled = set(config.disabled_rules)
    for finding in findings:
        if finding.rule_id in disabled:
            continue
        if finding.rule_id in config.severity_overrides:
            finding = finding.model_copy(update={"severity": config.severity_overrides[finding.rule_id]})
        result.append(finding)
    return result


def _finalize(findings: list[Finding]) -> list[Finding]:
    unique: dict[tuple, Finding] = {}
    for finding in findings:
        key = (
            finding.rule_id,
            finding.file or "",
            finding.line or 0,
            finding.variable or "",
            finding.service or "",
            finding.message,
        )
        unique.setdefault(key, finding)
    return sorted(
        unique.values(),
        key=lambda f: (
            f.rule_id,
            f.file or "",
            f.line or 0,
            f.variable or "",
            f.service or "",
            f.message,
        ),
    )


def _count(findings: list[Finding]) -> FindingCounts:
    counts = FindingCounts()
    for finding in findings:
        setattr(counts, finding.severity.value, getattr(counts, finding.severity.value) + 1)
    return counts


def _sorted_files(files: list[AnalyzedFile]) -> list[AnalyzedFile]:
    unique: dict[tuple[str, str], AnalyzedFile] = {}
    for entry in files:
        unique.setdefault((entry.path, entry.role), entry)
    return sorted(unique.values(), key=lambda f: (f.role, f.path))
