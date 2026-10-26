"""End-to-end tests of the scanning engine (no CLI, no HTTP)."""

import json

import pytest

from compose_env_guard.models import FailOn, Severity
from compose_env_guard.scanner import ScanOptions, scan_project
from compose_env_guard.security import ScanInputError
from conftest import EXAMPLES, findings_for, rule_ids

SECRET = "sentinel-value-DO-NOT-LEAK-9f2c"


def scan(path, **kwargs):
    return scan_project(path, ScanOptions(**kwargs))


# -- example projects -------------------------------------------------------------


def test_healthy_example_has_no_errors_or_warnings():
    report = scan(EXAMPLES / "healthy-project")
    assert report.counts.error == 0
    assert report.counts.warning == 0
    assert report.status == "passed"
    assert report.services == ["api", "worker"]


def test_broken_example_produces_the_expected_findings():
    report = scan(EXAMPLES / "broken-project")
    got = sorted((f.rule_id, f.variable or f.subject) for f in report.findings)
    assert got == sorted(
        [
            ("CEG001", "JWT_SECRET"),
            ("CEG002", "LOG_LEVEL"),
            ("CEG003", "config/missing.env"),
            ("CEG004", "LEGACY_API_URL"),
        ]
    )
    assert report.counts.error == 1 and report.counts.warning == 2 and report.counts.info == 1
    assert report.status == "failed"


# -- interpolation and template rules (CEG001, CEG002, CEG004) -----------------------


def test_ceg001_reports_each_undocumented_variable_once(make_project):
    project = make_project(
        {
            "compose.yaml": (
                "services:\n  api:\n    image: x:${TAG}\n    environment:\n"
                "      A: ${JWT}\n  worker:\n    environment:\n      B: ${JWT}\n"
            ),
            ".env.example": "TAG=1\n",
        }
    )
    report = scan(project)
    ceg001 = findings_for(report, "CEG001")
    assert [f.variable for f in ceg001] == ["JWT"]
    assert ceg001[0].severity is Severity.WARNING
    assert ceg001[0].line == 5
    assert ceg001[0].service == "api"
    assert "Compose" in ceg001[0].uncertainty or "shell" in ceg001[0].uncertainty


def test_ceg001_uses_non_claiming_language(make_project):
    project = make_project(
        {"compose.yaml": "services:\n  a:\n    image: x:${MISSING}\n", ".env.example": "X=1\n"}
    )
    finding = findings_for(scan(project), "CEG001")[0]
    assert "not documented" in finding.message
    assert "does not prove" in finding.uncertainty


def test_ceg001_mentions_defaults_when_present(make_project):
    project = make_project(
        {"compose.yaml": "services:\n  a:\n    image: x:${TAG:-latest}\n", ".env.example": "X=1\n"}
    )
    finding = findings_for(scan(project), "CEG001")[0]
    assert "default" in finding.uncertainty


def test_ceg001_suppressed_by_external_variables(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    environment:\n      K: ${CI_TOKEN}\n",
            ".env.example": "X=1\n",
            ".composeguard.yaml": "version: 1\nexternal_variables: [CI_TOKEN]\n",
        }
    )
    assert "CEG001" not in rule_ids(scan(project))


def test_ceg002_duplicate_template_variable(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    environment:\n      A: ${A}\n",
            ".env.example": "A=1\nB=2\nA=3\n",
        }
    )
    dup = findings_for(scan(project), "CEG002")
    assert len(dup) == 1
    assert dup[0].variable == "A" and dup[0].line == 3 and dup[0].severity is Severity.WARNING


def test_ceg004_unused_documented_variable_is_info(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    environment:\n      A: ${A}\n",
            ".env.example": "A=1\nUNUSED=2\n",
        }
    )
    unused = findings_for(scan(project), "CEG004")
    assert [f.variable for f in unused] == ["UNUSED"]
    assert unused[0].severity is Severity.INFO
    assert "application code" in unused[0].uncertainty.lower()


def test_ceg004_counts_container_env_keys_and_env_file_keys_as_observed(make_project):
    project = make_project(
        {
            "compose.yaml": (
                "services:\n  a:\n    environment:\n      LITERAL: fixed\n"
                "    env_file: ./defaults/.env.sample\n"
            ),
            ".env.example": "LITERAL=1\nFROM_FILE=2\n",
            "defaults/.env.sample": "FROM_FILE=x\n",
        }
    )
    report = scan(project)
    assert "CEG004" not in rule_ids(report)


def test_no_template_skips_template_rules_and_explains(make_project):
    project = make_project({"compose.yaml": "services:\n  a:\n    image: x:${TAG}\n"})
    report = scan(project)
    assert not {"CEG001", "CEG002", "CEG004"} & set(rule_ids(report))
    assert any("No environment template" in note for note in report.notes)


def test_template_can_be_chosen_explicitly(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    image: x:${TAG}\n",
            ".env.sample": "TAG=1\n",
            ".env.example": "OTHER=1\n",
        }
    )
    report = scan(project, env_example=".env.sample")
    assert [f.variable for f in findings_for(report, "CEG004")] == []
    assert report.counts.warning == 0


def test_template_default_prefers_env_example(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    image: x:${TAG}\n",
            ".env.sample": "TAG=1\n",
            ".env.example": "TAG=1\n",
        }
    )
    report = scan(project)
    template_files = [f.path for f in report.files if f.role == "template"]
    assert template_files == [".env.example"]


def test_template_invalid_lines_are_reported_without_values(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    image: x:${A}\n",
            ".env.example": f"A=1\n=secret-{SECRET}\nBAD NAME={SECRET}\nnot a line {SECRET}\n",
        }
    )
    report = scan(project)
    assert SECRET not in report.model_dump_json()
    ids = [(f.rule_id, f.severity) for f in report.findings]
    assert ("CEG008", Severity.ERROR) in ids
    assert ("CEG008", Severity.WARNING) in ids
    assert ("CEG005", Severity.WARNING) in ids


# -- env_file rules (CEG003, CEG005, CEG007) ----------------------------------------


def test_ceg003_required_missing_env_file_is_one_error_for_all_services(make_project):
    project = make_project(
        {
            "compose.yaml": (
                "services:\n  api:\n    env_file: ./config/missing.env\n"
                "  worker:\n    env_file:\n      - ./config/missing.env\n"
            ),
        }
    )
    report = scan(project)
    errors = findings_for(report, "CEG003")
    assert len(errors) == 1
    assert errors[0].subject == "config/missing.env"
    assert errors[0].severity is Severity.ERROR
    assert errors[0].service == "api"


@pytest.mark.parametrize(
    "compose_block",
    [
        "    env_file:\n      - path: ./optional.env\n        required: false\n",
        "    env_file:\n      - {path: ./optional.env, required: false}\n",
    ],
)
def test_optional_missing_env_file_is_not_an_error(make_project, compose_block):
    project = make_project({"compose.yaml": "services:\n  api:\n" + compose_block})
    report = scan(project)
    assert "CEG003" not in rule_ids(report)
    assert report.status == "passed"


def test_private_env_file_is_not_read_and_is_reported_as_unverified(make_project):
    project = make_project(
        {
            "compose.yaml": (
                "services:\n  api:\n    env_file: ./secrets.env\n    environment:\n      A: ${A}\n"
            ),
            ".env.example": "A=1\n",
            "secrets.env": f"TOKEN={SECRET}\n",
        }
    )
    report = scan(project)
    assert SECRET not in report.model_dump_json()
    info = findings_for(report, "CEG007")
    assert [f.file for f in info] == ["secrets.env"]
    assert info[0].severity is Severity.INFO
    assert "--include-env-file secrets.env" in info[0].suggestion
    assert [(f.path, f.status) for f in report.files if f.role == "env_file"] == [("secrets.env", "not_read")]


def test_project_dotenv_is_never_read_by_default(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    environment:\n      A: ${A}\n",
            ".env.example": "A=1\n",
            ".env": f"A={SECRET}\n",
        }
    )
    report = scan(project)
    assert SECRET not in report.model_dump_json()
    assert [f.file for f in findings_for(report, "CEG007")] == [".env"]


def test_included_env_file_contributes_names_only(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    env_file: ./app.env\n",
            ".env.example": "TOKEN=1\n",
            "app.env": f"TOKEN={SECRET}\n",
            ".composeguard.yaml": "version: 1\nservices:\n  api:\n    required_env: [TOKEN]\n",
        }
    )
    report = scan(project, include_env_files=["app.env"])
    assert SECRET not in report.model_dump_json()
    assert findings_for(report, "CEG007") == []
    assert findings_for(report, "CEG006") == []
    assert "CEG004" not in rule_ids(report)
    assert [(f.path, f.status) for f in report.files if f.role == "included_env_file"] == [
        ("app.env", "keys_read")
    ]


def test_env_file_interpolated_path_is_reported_as_unverified(make_project):
    project = make_project({"compose.yaml": "services:\n  api:\n    env_file: ./${ENV_DIR}/app.env\n"})
    report = scan(project)
    assert "CEG003" not in rule_ids(report)
    assert any("interpolation" in f.message for f in findings_for(report, "CEG005"))


def test_missing_env_file_when_verification_disabled_is_unverified_not_missing(make_project):
    project = make_project({"compose.yaml": "services:\n  api:\n    env_file: ./app.env\n"})
    report = scan(project, verify_existence=False)
    assert "CEG003" not in rule_ids(report)
    assert [f.file for f in findings_for(report, "CEG007")] == ["app.env"]


# -- Compose selection and overrides ----------------------------------------------


@pytest.mark.parametrize(
    "name",
    ["compose.yaml", "compose.yml", "docker-compose.yml", "docker-compose.yaml"],
)
def test_each_standard_compose_name_is_detected(make_project, name):
    project = make_project({name: "services:\n  a:\n    image: x\n"})
    report = scan(project)
    assert [f.path for f in report.files if f.role == "compose"] == [name]


def test_missing_compose_file_is_an_input_error_with_guidance(make_project):
    project = make_project({"README.md": "hello"})
    with pytest.raises(ScanInputError) as info:
        scan(project)
    assert "--compose" in str(info.value)


def test_explicit_override_files_are_analyzed_together(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    environment:\n      A: ${A}\n",
            "compose.prod.yaml": ("services:\n  api:\n    environment:\n      PROD_ONLY: ${PROD_ONLY}\n"),
            ".env.example": "A=1\nPROD_ONLY=1\n",
            ".composeguard.yaml": "version: 1\nservices:\n  api:\n    required_env: [PROD_ONLY]\n",
        }
    )
    report = scan(project, compose_files=["compose.yaml", "compose.prod.yaml"])
    assert report.counts.error == 0
    assert [f.path for f in report.files if f.role == "compose"] == ["compose.prod.yaml", "compose.yaml"]
    assert report.services == ["api"]


def test_override_file_present_but_not_selected_is_reported_as_skipped(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    image: x\n",
            "compose.override.yaml": "services:\n  api:\n    image: y\n",
        }
    )
    report = scan(project)
    assert any("override" in s.reason.lower() for s in report.skipped)


def test_nested_compose_file_through_explicit_relative_path(make_project):
    project = make_project({"services/api/compose.yaml": "services:\n  api:\n    image: x\n"})
    report = scan(project, compose_files=["services/api/compose.yaml"])
    assert report.services == ["api"]


def test_env_file_paths_are_relative_to_the_compose_file(make_project):
    project = make_project(
        {
            "stack/compose.yaml": "services:\n  api:\n    env_file: ./api.env\n",
            "stack/api.env": "X=1\n",
        }
    )
    report = scan(project, compose_files=["stack/compose.yaml"])
    assert "CEG003" not in rule_ids(report)
    assert [f.path for f in report.files if f.role == "env_file"] == ["stack/api.env"]


# -- contracts (CEG006) and configuration -------------------------------------------


def test_contract_missing_variable_is_an_error(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    environment:\n      A: ${A}\n",
            ".env.example": "A=1\n",
            ".composeguard.yaml": "version: 1\nservices:\n  api:\n    required_env: [A, JWT_SECRET]\n",
        }
    )
    findings = findings_for(scan(project), "CEG006")
    assert [(f.variable, f.severity) for f in findings] == [("JWT_SECRET", Severity.ERROR)]
    assert findings[0].service == "api"


def test_contract_for_undefined_service_is_an_error(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    image: x\n",
            ".composeguard.yaml": "version: 1\nservices:\n  billing:\n    required_env: [A]\n",
        }
    )
    findings = findings_for(scan(project), "CEG006")
    assert len(findings) == 1 and findings[0].severity is Severity.ERROR
    assert findings[0].service == "billing"


def test_contract_satisfied_by_list_and_mapping_forms(make_project):
    project = make_project(
        {
            "compose.yaml": (
                "services:\n  api:\n    environment:\n      A: x\n"
                "  worker:\n    environment:\n      - B=1\n      - C\n"
            ),
            ".composeguard.yaml": (
                "version: 1\nservices:\n  api:\n    required_env: [A]\n  worker:\n    required_env: [B, C]\n"
            ),
        }
    )
    assert findings_for(scan(project), "CEG006") == []


def test_contract_with_unread_env_file_is_a_warning_not_an_error(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    env_file: ./private.env\n",
            "private.env": "JWT=abc\n",
            ".composeguard.yaml": "version: 1\nservices:\n  api:\n    required_env: [JWT]\n",
        }
    )
    findings = findings_for(scan(project), "CEG006")
    assert len(findings) == 1
    assert findings[0].severity is Severity.WARNING
    assert "private.env" in findings[0].uncertainty


@pytest.mark.parametrize(
    "config_text",
    [
        "version: 2\n",
        "version: 1\nunknown_key: true\n",
        "version: 1\ndisabled_rules: [CEG999]\n",
        "version: 1\nseverity_overrides: {CEG999: error}\n",
        "version: 1\nservices:\n  api:\n    required_env: ['bad name']\n",
        "version: 1\nexternal_variables: ['not valid']\n",
        "version: 1\nservices:\n  api:\n    required_env: [A]\n    extra: 1\n",
        "- list\n",
        "version: [\n",
    ],
)
def test_invalid_configuration_is_an_input_error(make_project, config_text):
    project = make_project(
        {"compose.yaml": "services:\n  a:\n    image: x\n", ".composeguard.yaml": config_text}
    )
    with pytest.raises(ScanInputError):
        scan(project)


def test_invalid_configuration_error_does_not_echo_its_contents(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    image: x\n",
            ".composeguard.yaml": f"version: 1\nexternal_variables: ['{SECRET} bad']\n",
        }
    )
    with pytest.raises(ScanInputError) as info:
        scan(project)
    assert SECRET not in str(info.value)


def test_configuration_can_disable_rules_and_override_severity(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    environment:\n      A: ${A}\n",
            ".env.example": "A=1\nUNUSED=2\n",
            ".composeguard.yaml": (
                "version: 1\ndisabled_rules: [CEG004]\nseverity_overrides: {CEG002: error}\n"
            ),
        }
    )
    report = scan(project)
    assert "CEG004" not in rule_ids(report)


def test_severity_override_changes_fail_threshold(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    environment:\n      A: ${B}\n",
            ".env.example": "A=1\n",
            ".composeguard.yaml": "version: 1\nseverity_overrides: {CEG001: error}\n",
        }
    )
    report = scan(project)
    assert report.counts.error == 1 and report.status == "failed"


def test_config_path_option_must_exist(make_project):
    project = make_project({"compose.yaml": "services:\n  a:\n    image: x\n"})
    with pytest.raises(ScanInputError):
        scan(project, config_path="nope.yaml")


# -- YAML-level findings flow into the report -----------------------------------------


def test_malformed_yaml_is_reported_as_an_error_finding(make_project):
    project = make_project({"compose.yaml": "services:\n  api: [unclosed\n"})
    report = scan(project)
    assert report.status == "failed"
    assert [f.rule_id for f in report.findings] == ["CEG005"]


def test_empty_compose_file_is_reported_not_silently_passed(make_project):
    project = make_project({"compose.yaml": ""})
    report = scan(project)
    assert report.services == []
    assert [f.rule_id for f in report.findings] == ["CEG005"]
    assert report.counts.warning == 1


def test_compose_file_with_invalid_utf8_stops_the_scan_with_an_input_error(make_project):
    project = make_project({"compose.yaml": b"services:\n  a:\n    image: \xff\xfe\n"})
    with pytest.raises(ScanInputError, match="UTF-8"):
        scan(project)


def test_undecodable_compose_next_to_a_valid_one_is_reported_as_error(make_project):
    project = make_project(
        {
            "compose.yaml": b"services:\n  a:\n    image: \xff\n",
            "docker-compose.yml": "services:\n  a:\n    image: x\n",
        }
    )
    report = scan(project, compose_files=["compose.yaml", "docker-compose.yml"])
    errors = [f for f in report.findings if f.rule_id == "CEG005"]
    assert errors and errors[0].severity is Severity.ERROR and errors[0].file == "compose.yaml"


def test_utf8_bom_and_unicode_content_are_supported(make_project):
    project = make_project(
        {
            "compose.yaml": "\ufeffservices:\n  café:\n    environment:\n      NOM: ${NOM}\n".encode(),
            ".env.example": "NOM=Zoë 世界\n".encode(),
        }
    )
    report = scan(project)
    assert report.counts.error == 0
    assert report.services == ["café"]


# -- determinism and thresholds ----------------------------------------------------------


def test_repeated_scans_are_identical(make_project):
    project = make_project(
        {
            "compose.yaml": (
                "services:\n  b:\n    env_file: ./x.env\n    environment:\n      Z: ${Z}\n"
                "  a:\n    environment:\n      Y: ${Y}\n      X: ${X}\n"
            ),
            ".env.example": "Q=1\nP=1\nQ=2\n",
        }
    )
    first = scan(project).model_dump_json()
    second = scan(project).model_dump_json()
    assert first == second


def test_findings_are_sorted_by_rule_then_location(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    environment:\n      Z: ${Z}\n      Y: ${Y}\n",
            ".env.example": "Q=1\nQ=2\n",
        }
    )
    ids = [f.rule_id for f in scan(project).findings]
    assert ids == sorted(ids)


def test_duplicate_findings_are_collapsed(make_project):
    project = make_project(
        {
            "compose.yaml": (
                "services:\n  a:\n    image: ${X}\n  b:\n    image: ${X}\n    environment:\n      K: ${X}\n"
            ),
            ".env.example": "Y=1\n",
        }
    )
    assert [f.variable for f in findings_for(scan(project), "CEG001")] == ["X"]


@pytest.mark.parametrize(
    ("fail_on", "expected"),
    [
        (FailOn.ERROR, "passed"),
        (FailOn.WARNING, "failed"),
        (FailOn.INFO, "failed"),
        (FailOn.NEVER, "passed"),
    ],
)
def test_fail_on_threshold_with_a_warning_only_scan(make_project, fail_on, expected):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    environment:\n      A: ${A}\n",
            ".env.example": "A=1\nA=2\n",  # CEG002 duplicate: warning only
        }
    )
    report = scan(project, fail_on=fail_on)
    assert report.counts.warning == 1 and report.counts.error == 0
    assert report.status == expected


def test_info_only_scan_passes_at_default_threshold(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    environment:\n      A: ${A}\n",
            ".env.example": "A=1\nUNUSED=1\n",
        }
    )
    report = scan(project)
    assert report.counts.info == 1 and report.counts.warning == 0
    assert report.status == "passed"
    assert scan(project, fail_on=FailOn.INFO).status == "failed"


def test_report_json_contains_no_environment_values(make_project):
    project = make_project(
        {
            "compose.yaml": (
                f"services:\n  a:\n    environment:\n      K: ${{K:-{SECRET}}}\n    env_file: ./private.env\n"
            ),
            ".env.example": f"K={SECRET}\n",
            "private.env": f"Z={SECRET}\n",
            ".env": f"Q={SECRET}\n",
        }
    )
    report = scan(project)
    text = report.model_dump_json()
    assert SECRET not in text
    json.loads(text)


def test_absolute_include_path_inside_project_is_accepted(make_project):
    # Regression: an absolute path that points inside the project must work on the command line.
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    image: x\n",
            ".env.example": "A=1\n",
            "app.env": "A=SECRET_FROM_ABSOLUTE_PATH\n",
        }
    )
    report = scan(project, include_env_files=[str(project / "app.env")])
    assert [(f.path, f.status) for f in report.files if f.role == "included_env_file"] == [
        ("app.env", "keys_read")
    ]
    assert "SECRET_FROM_ABSOLUTE_PATH" not in report.model_dump_json()


def test_absolute_include_path_outside_project_is_rejected(make_project, tmp_path):
    project = make_project({"compose.yaml": "services:\n  api:\n    image: x\n", ".env.example": "A=1\n"})
    outside = tmp_path / "outside.env"
    outside.write_text("A=1\n")
    with pytest.raises(ScanInputError):
        scan(project, include_env_files=[str(outside)])


def test_template_symlink_outside_project_is_an_error_not_a_silent_pass(make_project, tmp_path):
    # Regression: a refused template used to be treated as "no template" and the scan passed.
    from conftest import can_symlink

    if not can_symlink():
        pytest.skip("symlinks are not available on this platform")
    project = make_project({"compose.yaml": "services:\n  api:\n    image: x\n"})
    outside = tmp_path / "outside.env"
    outside.write_text("A=1\n")
    (project / ".env.example").symlink_to(outside)
    report = scan(project)
    assert report.status == "failed"
    findings = findings_for(report, "CEG005")
    assert len(findings) == 1
    assert findings[0].severity == Severity.ERROR
    assert findings[0].file == ".env.example"
    assert str(outside) not in report.model_dump_json()


def test_compose_symlink_outside_project_is_refused_with_clear_error(make_project, tmp_path):
    from conftest import can_symlink

    if not can_symlink():
        pytest.skip("symlinks are not available on this platform")
    project = make_project({".env.example": "A=1\n"})
    outside = tmp_path / "outside.yaml"
    outside.write_text("services:\n  api:\n    image: x\n")
    (project / "compose.yaml").symlink_to(outside)
    with pytest.raises(ScanInputError, match=r"compose\.yaml resolves outside the project directory"):
        scan(project)


def test_outside_env_file_path_is_not_echoed_in_report(make_project):
    # Regression: the raw path of an env_file outside the project was copied into report.files.
    project = make_project({"compose.yaml": "services:\n  api:\n    env_file: ../../secret/location.env\n"})
    report = scan(project)
    dumped = report.model_dump_json()
    assert "secret/location.env" not in dumped
    assert any(f.status == "skipped" and "declared in compose.yaml" in f.path for f in report.files)
