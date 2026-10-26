from compose_env_guard.compose_parser import parse_compose
from compose_env_guard.models import Severity


def rules(facts):
    return sorted((f.rule_id, f.severity.value, f.line) for f in facts.findings)


def test_basic_services_environment_and_env_file():
    facts = parse_compose(
        """
services:
  api:
    image: app:${TAG}
    environment:
      DATABASE_URL: ${DATABASE_URL}
      DEBUG: "false"
    env_file: ./api.env
  worker:
    environment:
      - QUEUE=jobs
      - PASSTHROUGH
""",
        "compose.yaml",
    )
    assert sorted(facts.services) == ["api", "worker"]
    api = facts.services["api"]
    assert set(api.environment) == {"DATABASE_URL", "DEBUG"}
    assert api.environment["DATABASE_URL"].line == 6
    assert [(e.path, e.required) for e in api.env_files] == [("./api.env", True)]
    assert set(facts.services["worker"].environment) == {"QUEUE", "PASSTHROUGH"}
    assert [(r.ref.name, r.service) for r in facts.references] == [
        ("TAG", "api"),
        ("DATABASE_URL", "api"),
    ]
    assert facts.findings == []


def test_env_file_long_form_lists_and_required_flags():
    facts = parse_compose(
        """
services:
  api:
    env_file:
      - path: ./a.env
        required: false
      - {path: [./b.env, ./c.env]}
      - ./d.env
""",
        "compose.yaml",
    )
    entries = [(e.path, e.required) for e in facts.services["api"].env_files]
    assert entries == [("./a.env", False), ("./b.env", True), ("./c.env", True), ("./d.env", True)]
    assert facts.findings == []


def test_anchors_aliases_and_merge_keys_are_supported():
    facts = parse_compose(
        """
x-base: &base
  LOG_LEVEL: ${LOG_LEVEL:-info}
  SHARED: ${SHARED}
services:
  api:
    environment:
      <<: *base
      OWN: ${OWN}
      SHARED: override
  worker:
    environment: *base
""",
        "compose.yaml",
    )
    assert set(facts.services["api"].environment) == {"LOG_LEVEL", "SHARED", "OWN"}
    assert set(facts.services["worker"].environment) == {"LOG_LEVEL", "SHARED"}
    # Each underlying reference is recorded once, even though the anchor is aliased twice.
    names = [r.ref.name for r in facts.references]
    assert names.count("SHARED") == 1
    assert names.count("LOG_LEVEL") == 1
    assert facts.findings == []


def test_aliases_do_not_duplicate_findings():
    facts = parse_compose(
        """
x-bad: &bad
  - "=oops"
services:
  a:
    environment: *bad
  b:
    environment: *bad
""",
        "compose.yaml",
    )
    assert [f.rule_id for f in facts.findings].count("CEG008") == 1


def test_malformed_yaml_is_an_error_without_echoing_content():
    secret = "super-secret-token-123"
    facts = parse_compose(f"services:\n  api:\n    environment: [{secret}\n", "compose.yaml")
    assert len(facts.findings) == 1
    finding = facts.findings[0]
    assert finding.rule_id == "CEG005" and finding.severity is Severity.ERROR
    assert finding.line is not None
    assert secret not in finding.message and secret not in finding.suggestion


def test_multiple_documents_are_rejected():
    facts = parse_compose("services: {}\n---\nservices: {}\n", "compose.yaml")
    assert any("multiple YAML documents" in f.message for f in facts.findings)


def test_empty_file_is_a_warning():
    facts = parse_compose("", "compose.yaml")
    assert rules(facts) == [("CEG005", "warning", None)]
    assert facts.services == {}


def test_top_level_must_be_a_mapping():
    facts = parse_compose("- just\n- a list\n", "compose.yaml")
    assert rules(facts) == [("CEG005", "error", 1)]


def test_missing_services_section_is_a_warning():
    facts = parse_compose("name: demo\nnetworks: {}\n", "compose.yaml")
    assert [f.rule_id for f in facts.findings] == ["CEG005"]
    assert facts.findings[0].severity is Severity.WARNING


def test_services_must_be_a_mapping_and_each_service_too():
    assert rules(parse_compose("services: [a, b]\n", "c.yaml"))[0][0] == "CEG005"
    facts = parse_compose("services:\n  api: just-a-string\n", "c.yaml")
    assert [f.severity for f in facts.findings] == [Severity.ERROR]


def test_duplicate_mapping_keys_are_errors():
    facts = parse_compose("services:\n  api:\n    environment:\n      A: 1\n      A: 2\n", "compose.yaml")
    messages = [f.message for f in facts.findings]
    assert any("defined more than once" in m for m in messages)


def test_custom_tags_and_extends_and_include_are_reported_as_unsupported():
    facts = parse_compose(
        """
include:
  - other.yaml
services:
  api:
    extends:
      file: base.yaml
      service: base
    environment: !reset {}
""",
        "compose.yaml",
    )
    texts = " ".join(f.message for f in facts.findings)
    assert "'include'" in texts
    assert "'extends'" in texts
    assert "!reset" in texts
    assert all(f.severity is Severity.WARNING for f in facts.findings)


def test_recursive_alias_is_reported():
    facts = parse_compose("services:\n  api:\n    environment: &e\n      X: *e\n", "compose.yaml")
    assert any("recursive" in f.message for f in facts.findings)


def test_invalid_interpolation_is_an_error_and_does_not_echo_the_value():
    secret = "very-secret-default"
    facts = parse_compose(
        f"services:\n  api:\n    environment:\n      A: ${{B:-{secret}}}$\n", "compose.yaml"
    )
    errors = [f for f in facts.findings if f.severity is Severity.ERROR]
    assert len(errors) == 1
    assert secret not in errors[0].message
    assert errors[0].line == 4


def test_environment_list_problems():
    facts = parse_compose(
        """
services:
  api:
    environment:
      - "=no-name"
      - "  =spaces"
      - "BAD NAME=1"
      - "GOOD=1"
      - "GOOD=2"
      - [nested]
      - 123
""",
        "compose.yaml",
    )
    got = [(f.rule_id, f.severity.value, f.line) for f in facts.findings]
    assert ("CEG008", "error", 5) in got  # empty name
    assert ("CEG008", "error", 6) in got  # whitespace-only name
    assert ("CEG008", "warning", 7) in got  # invalid name
    assert ("CEG008", "warning", 9) in got  # duplicate definition
    assert ("CEG008", "error", 10) in got  # nested list entry
    assert ("CEG008", "warning", 11) in got  # numeric name is not a valid identifier
    assert all("nested" not in f.message for f in facts.findings)
    assert "BAD NAME" not in " ".join(f.message for f in facts.findings)


def test_environment_mapping_problems_never_echo_values():
    secret = "value-should-not-appear"
    facts = parse_compose(
        f"""
services:
  api:
    environment:
      "": {secret}
      "BAD-NAME": {secret}
      LIST_VALUE:
        - {secret}
""",
        "compose.yaml",
    )
    ids = sorted((f.rule_id, f.severity.value) for f in facts.findings)
    assert ids == [("CEG008", "error"), ("CEG008", "error"), ("CEG008", "warning")]
    for finding in facts.findings:
        assert secret not in finding.message


def test_null_environment_and_passthrough_mapping_key_are_accepted():
    facts = parse_compose("services:\n  api:\n    environment:\n      PASS:\n    env_file:\n", "compose.yaml")
    assert set(facts.services["api"].environment) == {"PASS"}
    assert facts.findings == []


def test_environment_must_be_mapping_or_list():
    facts = parse_compose("services:\n  api:\n    environment: oops\n", "compose.yaml")
    assert rules(facts) == [("CEG005", "error", 3)]


def test_invalid_env_file_forms():
    facts = parse_compose(
        """
services:
  api:
    env_file:
      - {}
      - {path: ./x.env, required: maybe}
      - {path: ./y.env, unknown: true}
      - ""
      - [nested]
""",
        "compose.yaml",
    )
    severities = [f.severity for f in facts.findings]
    assert severities.count(Severity.ERROR) >= 3
    assert any("Unsupported env_file option" in f.message for f in facts.findings)
    # Unusable entries are dropped; the entry with an unknown option is still usable (with a warning).
    assert [e.path for e in facts.services["api"].env_files] == ["./y.env"]


def test_unicode_content_is_preserved():
    facts = parse_compose(
        "services:\n  café:\n    environment:\n      GREETING: ${GREETING:-こんにちは}\n",
        "compose.yaml",
    )
    assert "café" in facts.services
    assert [r.ref.name for r in facts.references] == ["GREETING"]


def test_python_object_tag_on_image_is_reported_once_and_not_constructed():
    # Regression: '!!python/...' expands to tag:yaml.org,2002:python/... and was not detected,
    # and tags on fields such as 'image' were never visited. The tag must be reported once,
    # with its line, and must never be constructed into a Python object.
    text = (
        "services:\n"
        "  api:\n"
        "    image: !!python/object/apply:os.system ['echo CANARY_TAG_RUN']\n"
        "    environment:\n"
        "      K: v\n"
    )
    facts = parse_compose(text, "compose.yaml")
    tag_findings = [f for f in facts.findings if f.rule_id == "CEG005" and "tag" in f.message]
    assert len(tag_findings) == 1
    assert tag_findings[0].severity == Severity.WARNING
    assert tag_findings[0].line == 3
    assert "CANARY_TAG_RUN" not in " ".join(f.message for f in facts.findings)


def test_core_implicit_tags_such_as_dates_are_not_reported():
    text = "services:\n  api:\n    image: x\n    labels:\n      released: 2024-01-01\n      count: 3\n"
    facts = parse_compose(text, "compose.yaml")
    assert [f for f in facts.findings if "tag" in f.message] == []
