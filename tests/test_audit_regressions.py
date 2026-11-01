"""Synthetic adversarial inputs found during the 2026-11 audit."""

import json
import subprocess

import pytest
from fastapi.testclient import TestClient

from compose_env_guard.api import create_app
from compose_env_guard.compose_parser import parse_compose
from compose_env_guard.scanner import scan_project

CANARY = "CANARY-audit-value-739"


@pytest.mark.parametrize(
    "payload",
    [
        {"files": {"compose.yaml": "services: {}"}, CANARY: "value"},
        {"files": {".env.example": "K=value"}, "compose_files": []},
        {"files": {"compose.yaml": {CANARY: "value"}}},
        {
            "files": {
                "compose.yaml": "services: {}",
                ".composeguard.yaml": f"services:\n  api:\n    required_env: {CANARY}\n",
            }
        },
        {"files": {"compose.yaml": "services: {}", ".composeguard.yaml": f"{CANARY}: true\n"}},
    ],
)
def test_validation_errors_redact_untrusted_locations_and_messages(payload):
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        response = client.post("/api/v1/scan", json=payload)
    assert response.status_code == 422
    assert CANARY not in response.text


@pytest.mark.parametrize("path", ["./${BROKEN", f"./${{DIR:-{CANARY}}}/app.env"])
def test_env_file_interpolation_is_safe_and_does_not_echo_defaults(make_project, path):
    project = make_project(
        {
            "compose.yaml": f"services:\n  api:\n    env_file: '{path}'\n",
            ".env.example": "UNUSED=x\n",
        }
    )
    report = scan_project(project)
    assert any(f.rule_id == "CEG005" for f in report.findings)
    assert CANARY not in report.model_dump_json()


@pytest.mark.parametrize(
    "text",
    [
        "x: &x {<<: *x}\nservices: {}\n",
        "x: " + "[" * 600 + "0" + "]" * 600 + "\nservices: {}\n",
    ],
)
def test_recursive_and_deep_yaml_returns_diagnostics(text):
    facts = parse_compose(text, "compose.yaml")
    assert any(f.rule_id == "CEG005" and f.severity.value == "error" for f in facts.findings)


def test_docker_probe_timeout_is_an_unavailable_capability(monkeypatch):
    import test_docker

    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired("docker info", 30)

    monkeypatch.setattr(test_docker.shutil, "which", lambda name: "docker")
    monkeypatch.setattr(test_docker.subprocess, "run", timeout)
    assert not test_docker._docker_available()


@pytest.mark.parametrize("config", ["x: " + "[" * 600 + "0" + "]" * 600, "x: &x {<<: *x}"])
def test_config_yaml_complexity_is_a_safe_input_error(make_project, config):
    from compose_env_guard.security import ScanInputError

    project = make_project({"compose.yaml": "services: {}", ".composeguard.yaml": config})
    with pytest.raises(ScanInputError, match="not valid YAML"):
        scan_project(project)


def test_config_alias_expansion_is_bounded(make_project):
    config = "a0: &a0 {key: value}\n"
    for i in range(1, 16):
        config += f"a{i}: &a{i} {{<<: [*a{i - 1}, *a{i - 1}]}}\n"
    test_config_yaml_complexity_is_a_safe_input_error(make_project, config)


def test_api_automatically_selects_nonstandard_compose_name():
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/v1/scan", json={"files": {"compose.prod.yaml": "services:\n  api:\n    image: x\n"}}
        )
    assert response.status_code == 200
    assert response.json()["services"] == ["api"]


def test_api_rejects_surrogate_text_and_newline_filenames():
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        for files in ({"compose.yaml": "\ud800"}, {"compose.yaml\n": "services: {}"}):
            response = client.post(
                "/api/v1/scan",
                content=json.dumps({"files": files}),
                headers={"content-type": "application/json"},
            )
            assert response.status_code == 422
