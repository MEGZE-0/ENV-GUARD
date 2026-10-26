"""Regression tests: planted secret values must never appear in any output channel.

Every canary below is an invented value. The tests cover the places where a value could
leak: YAML syntax errors (PyYAML quotes source text), dotenv syntax errors, invalid names,
included env files, the terminal/JSON/Markdown reporters, and API validation errors.
"""

import pytest
from fastapi.testclient import TestClient
from typer.testing import CliRunner

from compose_env_guard.api import create_app
from compose_env_guard.cli import app as cli_app

# Planted VALUES. Variable names are allowed in output; these exact strings must never appear.
VALUES = [
    "CANARY_LITERAL_1",
    "CANARY_BADNAME_2",
    "CANARY_ORPHAN_3",
    "CANARY_TEMPLATE_VALUE_4",
    "CANARY_ENVFILE_VALUE_5",
    "CANARY_PRIVATE_DOTENV_6",
    "CANARY_BROKEN_YAML_7",
    "CANARY_FLOW_8",
    "CANARY_API_BODY_9",
    "CANARY_API_BODY_10",
    "CANARY_API_BODY_11",
    "CANARY_API_BODY_12",
    "CANARY_API_BODY_13",
]


def _leaked(text: str) -> list[str]:
    return [value for value in VALUES if value in text]


@pytest.fixture
def leaky_project(make_project):
    return make_project(
        {
            "compose.yaml": (
                "services:\n"
                "  api:\n"
                "    image: example/api:${TAG}\n"
                "    environment:\n"
                '      PASSWORD: "CANARY_LITERAL_1"\n'
                "    env_file: ./app.env\n"
            ),
            ".env.example": (
                "TAG=1\n"
                "BAD NAME=CANARY_BADNAME_2\n"
                "=CANARY_ORPHAN_3\n"
                "CANARY_TEMPLATE_KEY_4=CANARY_TEMPLATE_VALUE_4\n"
            ),
            "app.env": "APPKEY=CANARY_ENVFILE_VALUE_5\n",
            ".env": "DB_PASSWORD=CANARY_PRIVATE_DOTENV_6\n",
            "malformed.yaml": "services:\n  api: [CANARY_BROKEN_YAML_7\n",
            "flow.yaml": "services:\n  api:\n    environment: {K: CANARY_FLOW_8 ]\n",
        }
    )


def test_cli_outputs_never_contain_values(leaky_project):
    runner = CliRunner()
    for fmt in ("terminal", "json", "markdown"):
        result = runner.invoke(
            cli_app,
            ["scan", str(leaky_project), "--format", fmt, "--include-env-file", str(leaky_project / ".env")],
        )
        assert result.exit_code in (0, 1, 2), result.output
        assert _leaked(result.output) == [], fmt


@pytest.mark.parametrize("name", ["malformed.yaml", "flow.yaml"])
def test_yaml_syntax_errors_do_not_echo_source_line(leaky_project, name):
    runner = CliRunner()
    result = runner.invoke(
        cli_app,
        ["scan", str(leaky_project), "--compose", name, "--format", "json"],
    )
    assert _leaked(result.output) == []


def test_included_env_file_values_are_discarded(leaky_project):
    runner = CliRunner()
    result = runner.invoke(
        cli_app,
        ["scan", str(leaky_project), "--format", "json", "--include-env-file", "app.env"],
    )
    assert _leaked(result.output) == []
    assert '"status": "keys_read"' in result.output  # the file was read for names only


def test_api_validation_errors_do_not_echo_request_content():
    client = TestClient(create_app(), raise_server_exceptions=False)
    bodies = [
        {"files": {"compose.yaml": {"nested": "CANARY_API_BODY_9"}}},
        {"files": {".env": "TOKEN=CANARY_API_BODY_10"}},
        {"files": {"compose.yaml": "services: {}"}, "fail_on": "CANARY_API_BODY_11"},
        {"files": {"compose.yaml": "services:\n  api: [CANARY_API_BODY_12"}},
    ]
    for body in bodies:
        response = client.post("/api/v1/scan", json=body)
        assert response.status_code in (200, 422)
        assert _leaked(response.text) == [], body


def test_api_rejects_invalid_json_without_echo():
    client = TestClient(create_app(), raise_server_exceptions=False)
    response = client.post(
        "/api/v1/scan",
        content=b'{"files": {"compose.yaml": CANARY_API_BODY_13',
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 422
    assert _leaked(response.text) == []
