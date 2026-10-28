import json

import pytest
from typer.testing import CliRunner

from compose_env_guard import __version__
from compose_env_guard.cli import app
from compose_env_guard.models import Report
from conftest import EXAMPLES

runner = CliRunner()
SECRET = "CLI-SECRET-sentinel-55aa"


def invoke(*args, env=None):
    return runner.invoke(app, list(args), env=env)


def test_version():
    result = invoke("version")
    assert result.exit_code == 0
    assert result.stdout.strip() == f"composeguard {__version__}"


def test_help_lists_commands():
    result = invoke("--help")
    assert result.exit_code == 0
    for command in ("scan", "rules", "version", "serve"):
        assert command in result.stdout


def test_scan_help_documents_options():
    result = invoke("scan", "--help")
    assert result.exit_code == 0
    for option in ("--format", "--output", "--fail-on", "--env-example", "--compose", "--include-env-file"):
        assert option in result.stdout


def test_no_arguments_shows_help():
    result = invoke()
    assert "Usage" in result.output


def test_healthy_example_exits_zero():
    result = invoke("scan", str(EXAMPLES / "healthy-project"))
    assert result.exit_code == 0, result.output
    assert "Final status: Passed" in result.stdout
    assert "Project: healthy-project" in result.stdout


def test_broken_example_exits_one_and_shows_actionable_output():
    result = invoke("scan", str(EXAMPLES / "broken-project"))
    assert result.exit_code == 1
    assert any(
        needle in result.stdout
        for needle in ("[WARNING] CEG001 — JWT_SECRET", "[WARNING] CEG001 - JWT_SECRET")
    )
    assert any(
        needle in result.stdout
        for needle in ("[ERROR] CEG003 — config/missing.env", "[ERROR] CEG003 - config/missing.env", "CEG003")
    )
    assert any(
        needle in result.stdout
        for needle in ("[INFO] CEG004 — LEGACY_API_URL", "[INFO] CEG004 - LEGACY_API_URL")
    )
    assert (
        "Errors: 1" in result.stdout and "Warnings: 2" in result.stdout and "Information: 1" in result.stdout
    )
    assert "Final status: Failed" in result.stdout


@pytest.mark.parametrize(
    ("fail_on", "code"),
    [("error", 1), ("warning", 1), ("info", 1), ("never", 0)],
)
def test_fail_on_controls_exit_code(fail_on, code):
    result = invoke("scan", str(EXAMPLES / "broken-project"), "--fail-on", fail_on)
    assert result.exit_code == code


def test_warnings_do_not_fail_by_default(make_project):
    project = make_project({"compose.yaml": "services:\n  a:\n    image: x\n", ".env.example": "A=1\nA=2\n"})
    result = invoke("scan", str(project))
    assert result.exit_code == 0
    assert "CEG002" in result.stdout


def test_invalid_fail_on_is_a_usage_error():
    result = invoke("scan", str(EXAMPLES / "healthy-project"), "--fail-on", "panic")
    assert result.exit_code == 2


def test_missing_compose_file_exits_two_with_guidance(make_project):
    project = make_project({"README.md": "nothing here"})
    result = invoke("scan", str(project))
    assert result.exit_code == 2
    assert "--compose" in result.output
    assert "Final status" not in result.output


def test_nonexistent_project_exits_two(tmp_path):
    result = invoke("scan", str(tmp_path / "nope"))
    assert result.exit_code == 2
    assert "does not exist" in result.output


def test_invalid_format_exits_two():
    result = invoke("scan", str(EXAMPLES / "healthy-project"), "--format", "xml")
    assert result.exit_code == 2


def test_json_output_is_parseable_and_versioned():
    result = invoke("scan", str(EXAMPLES / "broken-project"), "--format", "json")
    assert result.exit_code == 1
    data = json.loads(result.stdout)
    assert data["schema_version"] == "1.0"
    report = Report.model_validate(data)
    assert report.counts.error == 1
    assert [f.rule_id for f in report.findings] == ["CEG001", "CEG002", "CEG003", "CEG004"]


def test_markdown_output():
    result = invoke("scan", str(EXAMPLES / "broken-project"), "--format", "markdown")
    assert result.exit_code == 1
    assert result.stdout.startswith("# ComposeEnvGuard report: broken-project")
    assert "| Severity | Rule |" in result.stdout
    assert "CEG001" in result.stdout


def test_output_file_is_written(tmp_path):
    target = tmp_path / "report.json"
    result = invoke("scan", str(EXAMPLES / "healthy-project"), "--format", "json", "--output", str(target))
    assert result.exit_code == 0
    assert target.exists()
    assert json.loads(target.read_text())["status"] == "passed"
    assert "Report written to" in result.stdout


def test_output_file_in_terminal_format(tmp_path):
    target = tmp_path / "report.txt"
    result = invoke("scan", str(EXAMPLES / "broken-project"), "--output", str(target))
    assert result.exit_code == 1
    assert "Final status: Failed" in target.read_text()


def test_output_to_missing_directory_exits_two(tmp_path):
    result = invoke(
        "scan", str(EXAMPLES / "healthy-project"), "--output", str(tmp_path / "no" / "report.json")
    )
    assert result.exit_code == 2


def test_explicit_compose_and_template_options(make_project):
    project = make_project(
        {
            "stack/app.yaml": "services:\n  a:\n    image: x:${TAG}\n",
            "stack/.env.sample": "TAG=1\n",
        }
    )
    result = invoke(
        "scan",
        str(project),
        "--compose",
        "stack/app.yaml",
        "--env-example",
        "stack/.env.sample",
        "--format",
        "json",
    )
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["services"] == ["a"]


def test_include_env_file_option(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    env_file: ./app.env\n",
            ".env.example": "TOKEN=1\n",
            "app.env": f"TOKEN={SECRET}\n",
        }
    )
    result = invoke("scan", str(project), "--include-env-file", "app.env", "--format", "json")
    assert result.exit_code == 0
    assert SECRET not in result.stdout


def test_no_secret_values_in_any_cli_format(make_project):
    project = make_project(
        {
            "compose.yaml": f"services:\n  a:\n    image: x:${{T:-{SECRET}}}\n    env_file: ./p.env\n",
            ".env.example": f"A={SECRET}\nB C={SECRET}\n",
            "p.env": f"Z={SECRET}\n",
        }
    )
    for fmt in ("terminal", "json", "markdown"):
        result = invoke("scan", str(project), "--format", fmt)
        assert SECRET not in result.output, fmt


def test_no_color_environment_removes_ansi_sequences(make_project):
    project = make_project({"compose.yaml": "services:\n  a:\n    image: x:${T}\n", ".env.example": "A=1\n"})
    # Control case: forced colour really produces ANSI codes, so the next assertion is meaningful.
    coloured = invoke("scan", str(project), env={"FORCE_COLOR": "1", "NO_COLOR": None})
    assert "\x1b[" in coloured.output
    plain = invoke("scan", str(project), env={"FORCE_COLOR": "1", "NO_COLOR": "1"})
    assert "\x1b[" not in plain.output
    assert "[WARNING] CEG001" in plain.output


def test_rules_command_lists_every_rule():
    result = invoke("rules")
    assert result.exit_code == 0
    for rule_id in ["CEG001", "CEG002", "CEG003", "CEG004", "CEG005", "CEG006", "CEG007", "CEG008"]:
        assert rule_id in result.stdout


def test_rules_json():
    result = invoke("rules", "--format", "json")
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert [r["id"] for r in data] == [f"CEG00{i}" for i in range(1, 9)]


def test_unexpected_failure_is_reported_without_internals(monkeypatch):
    import compose_env_guard.cli as cli

    def boom(*_args, **_kwargs):
        raise RuntimeError(f"internal detail {SECRET}")

    monkeypatch.setattr(cli, "scan_project", boom)
    result = invoke("scan", str(EXAMPLES / "healthy-project"))
    assert result.exit_code == 2
    assert "unexpected failure" in result.output
    assert SECRET not in result.output


def test_terminal_reporter_supports_ascii_and_legacy_windows_console_encodings():
    import io

    from rich.console import Console

    from compose_env_guard.reporters import format_separator, print_terminal
    from compose_env_guard.scanner import ScanOptions, scan_project

    class MockStream:
        def __init__(self, enc):
            self.encoding = enc
            self._buf = io.StringIO()

        def write(self, s):
            return self._buf.write(s)

        def flush(self):
            pass

        def getvalue(self):
            return self._buf.getvalue()

    for enc in ("cp437", "ascii"):
        stream = MockStream(enc)
        console = Console(file=stream, no_color=True)
        assert format_separator(console) == "-"

    stream_utf8 = MockStream("utf-8")
    console_utf8 = Console(file=stream_utf8, no_color=True)
    assert format_separator(console_utf8) == "—"

    report = scan_project(str(EXAMPLES / "broken-project"), ScanOptions())
    cp437_stream = MockStream("cp437")
    cp437_console = Console(file=cp437_stream, no_color=True)
    print_terminal(report, cp437_console)
    output = cp437_stream.getvalue()
    assert "[WARNING] CEG001 - JWT_SECRET" in output
    assert "Errors: 1" in output
