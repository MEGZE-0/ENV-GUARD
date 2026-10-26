"""Tests for the composite GitHub Action script, packaging metadata and deployment files."""

import os
import shutil
import stat
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

from compose_env_guard import __version__
from compose_env_guard.models import Report
from conftest import EXAMPLES, REPO_ROOT

SCRIPT = REPO_ROOT / "scripts" / "ci-scan.sh"
needs_bash = pytest.mark.skipif(shutil.which("bash") is None, reason="bash is not available")


def _wrapper(tmp_path: Path, exit_code: int | None = None) -> Path:
    """An executable stand-in for 'composeguard' that runs the real CLI and logs its argv."""
    log = tmp_path / "argv.log"
    script = tmp_path / "composeguard-wrapper"
    tail = (
        f"exit {exit_code}"
        if exit_code is not None
        else f'exec "{sys.executable}" -m compose_env_guard.cli "$@"'
    )
    script.write_text(f'#!/bin/sh\nprintf "%s\\n" "$@" > "{log}"\n{tail}\n')
    script.chmod(script.stat().st_mode | stat.S_IEXEC)
    return script


def _run_script(env_overrides: dict[str, str], tmp_path: Path) -> subprocess.CompletedProcess:
    env = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": str(tmp_path),
        "RUNNER_TEMP": str(tmp_path),
        "CEG_ACTION_PATH": str(REPO_ROOT),
        "PYTHONPATH": str(REPO_ROOT / "src"),
        **env_overrides,
    }
    return subprocess.run(
        ["bash", str(SCRIPT)], env=env, capture_output=True, text=True, timeout=120, check=False
    )


@needs_bash
def test_action_script_passes_arguments_safely_and_writes_summary(tmp_path):
    summary = tmp_path / "summary.md"
    # The recording stub exits 0 so we can inspect argv; the real scanner would reject the odd name.
    wrapper = _wrapper(tmp_path, exit_code=0)
    result = _run_script(
        {
            "CEG_COMPOSEGUARD_BIN": str(wrapper),
            "CEG_PATH": str(EXAMPLES / "broken-project"),
            "CEG_ENV_EXAMPLE": ".env.sample",
            # A hostile value must reach the scanner as a literal, never be executed.
            "CEG_COMPOSE_FILES": "compose.yaml\n\n  $(touch pwned.txt)  \n",
            "CEG_FAIL_ON": "never",
            "GITHUB_STEP_SUMMARY": str(summary),
        },
        tmp_path,
    )
    assert result.returncode == 0, result.stderr
    argv = (tmp_path / "argv.log").read_text().splitlines()
    assert argv[:2] == ["scan", str(EXAMPLES / "broken-project")]
    assert "--fail-on" in argv and argv[argv.index("--fail-on") + 1] == "never"
    assert argv[argv.index("--env-example") + 1] == ".env.sample"
    compose_args = [argv[i + 1] for i, a in enumerate(argv) if a == "--compose"]
    assert compose_args == ["compose.yaml", "$(touch pwned.txt)"]
    assert not (Path.cwd() / "pwned.txt").exists()
    # The stub writes no report, so the script must still leave an explanation in the summary.
    assert "No report was produced" in summary.read_text()


@needs_bash
def test_action_script_propagates_scanner_exit_code(tmp_path):
    result = _run_script(
        {
            "CEG_COMPOSEGUARD_BIN": str(_wrapper(tmp_path, exit_code=1)),
            "CEG_PATH": str(EXAMPLES / "broken-project"),
        },
        tmp_path,
    )
    assert result.returncode == 1


@needs_bash
def test_action_script_fails_on_invalid_threshold_before_running(tmp_path):
    result = _run_script(
        {
            "CEG_COMPOSEGUARD_BIN": str(_wrapper(tmp_path)),
            "CEG_PATH": str(EXAMPLES / "healthy-project"),
            "CEG_FAIL_ON": "bogus; rm -rf /",
        },
        tmp_path,
    )
    assert result.returncode == 2
    assert "fail-on must be one of" in result.stderr
    assert not (tmp_path / "argv.log").exists()


@needs_bash
@pytest.mark.parametrize(
    ("env_name", "value"),
    [
        ("CEG_PATH", "--format"),
        ("CEG_ENV_EXAMPLE", "--output=/tmp/x"),
        ("CEG_COMPOSE_FILES", "compose.yaml\n--fail-on=never"),
    ],
)
def test_action_script_rejects_option_like_inputs(tmp_path, env_name, value):
    # Regression: a value starting with '-' must never be parsed by the CLI as an option.
    env = {
        "CEG_COMPOSEGUARD_BIN": str(_wrapper(tmp_path)),
        "CEG_PATH": str(EXAMPLES / "healthy-project"),
        "CEG_FAIL_ON": "error",
    }
    env[env_name] = value
    result = _run_script(env, tmp_path)
    assert result.returncode == 2
    assert "must not start with '-'" in result.stderr
    assert not (tmp_path / "argv.log").exists()


@needs_bash
def test_action_script_rejects_missing_project_directory(tmp_path):
    result = _run_script(
        {"CEG_COMPOSEGUARD_BIN": str(_wrapper(tmp_path)), "CEG_PATH": str(tmp_path / "missing")},
        tmp_path,
    )
    assert result.returncode == 2


@needs_bash
def test_action_script_writes_markdown_summary_for_passing_scan(tmp_path):
    summary = tmp_path / "summary.md"
    result = _run_script(
        {
            "CEG_COMPOSEGUARD_BIN": str(_wrapper(tmp_path)),
            "CEG_PATH": str(EXAMPLES / "healthy-project"),
            "GITHUB_STEP_SUMMARY": str(summary),
        },
        tmp_path,
    )
    assert result.returncode == 0, result.stderr
    assert "**Final status:** Passed" in summary.read_text()


def test_action_yaml_is_a_composite_action_with_documented_inputs():
    action = yaml.safe_load((REPO_ROOT / "action.yml").read_text())
    assert action["runs"]["using"] == "composite"
    assert set(action["inputs"]) >= {
        "path",
        "env-example",
        "compose-files",
        "fail-on",
        "python-version",
        "setup-python",
    }
    assert action["inputs"]["fail-on"]["default"] == "error"
    for step in action["runs"]["steps"]:
        if "run" in step:
            assert step["shell"] == "bash"
            # Inputs must reach the script through env, never interpolated into the script body.
            assert "${{" not in step["run"]


def test_action_pins_stable_major_versions():
    action = yaml.safe_load((REPO_ROOT / "action.yml").read_text())
    uses = [s["uses"] for s in action["runs"]["steps"] if "uses" in s]
    assert uses == ["actions/setup-python@v7"]


def test_ci_workflow_is_valid_and_runs_the_quality_gates():
    workflow = yaml.safe_load((REPO_ROOT / ".github/workflows/ci.yml").read_text())
    assert set(workflow[True if True in workflow else "on"]) >= {"push", "pull_request"}
    text = (REPO_ROOT / ".github/workflows/ci.yml").read_text()
    for needle in ["ruff check", "pytest", "--cov", "python -m build", "composeguard scan"]:
        assert needle in text
    assert "permissions:" in text and "contents: read" in text


def test_version_is_consistent_between_package_and_pyproject():
    data = (REPO_ROOT / "pyproject.toml").read_text()
    assert "compose_env_guard.__version__" in data  # single source of truth
    assert __version__ == "0.1.0"


def test_dockerfile_and_compose_are_safe_by_default():
    dockerfile = (REPO_ROOT / "Dockerfile").read_text()
    assert "USER " in dockerfile and "root" not in dockerfile.split("USER", 1)[1].split("\n")[0]
    assert "docker.sock" not in dockerfile
    compose = yaml.safe_load((REPO_ROOT / "compose.yaml").read_text())
    api = compose["services"]["api"]
    assert api["ports"] == ["127.0.0.1:8000:8000"]
    assert all("docker.sock" not in v for v in api.get("volumes", []))
    assert "privileged" not in api
    assert api.get("read_only") is True
    assert "compose_env_guard.api:app" in " ".join(api["command"])


def test_example_compose_files_do_not_publish_ports_on_all_interfaces():
    for path in EXAMPLES.rglob("compose*.y*ml"):
        text = path.read_text()
        assert '"0.0.0.0' not in text


def test_report_json_schema_document_is_up_to_date():
    import json

    committed = json.loads((REPO_ROOT / "docs" / "report.schema.json").read_text())
    assert committed == Report.model_json_schema()


def test_every_rule_is_documented():
    from compose_env_guard.rules import RULES

    text = (REPO_ROOT / "docs" / "rules.md").read_text()
    for rule in RULES:
        assert rule.id in text
        assert rule.title in text


def test_example_projects_are_present():
    for name in ("healthy-project", "broken-project"):
        assert (EXAMPLES / name / "compose.yaml").is_file()
        assert (EXAMPLES / name / ".env.example").is_file() or (EXAMPLES / name / ".env.sample").is_file()
