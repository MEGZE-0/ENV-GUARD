import json

import pytest
from fastapi.testclient import TestClient

from compose_env_guard import __version__
from compose_env_guard.api import create_app
from compose_env_guard.models import Report
from compose_env_guard.rules import RULES
from conftest import EXAMPLES

SECRET = "API-SECRET-sentinel-9x"


@pytest.fixture
def client():
    return TestClient(create_app(), raise_server_exceptions=False)


def read_example(name):
    files = {}
    for entry in (EXAMPLES / name).iterdir():
        if entry.name in ("compose.yaml", ".env.example", ".env.sample", ".composeguard.yaml"):
            files[entry.name] = entry.read_text()
    return files


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": __version__}


def test_rules_endpoint_matches_the_rule_registry(client):
    response = client.get("/api/v1/rules")
    assert response.status_code == 200
    assert [r["id"] for r in response.json()] == [r.id for r in RULES]


def test_docs_are_served(client):
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def test_valid_scan_returns_the_report_schema(client):
    response = client.post("/api/v1/scan", json={"files": read_example("broken-project")})
    assert response.status_code == 200
    report = Report.model_validate(response.json())
    assert report.status == "passed"  # the API cannot see config/missing.env, so no CEG003 error
    assert [f.rule_id for f in report.findings] == ["CEG001", "CEG002", "CEG004", "CEG007"]


def test_findings_are_a_success_response_not_an_error(client):
    response = client.post(
        "/api/v1/scan",
        json={
            "files": {"compose.yaml": "services:\n  a:\n    image: x:${MISSING}\n", ".env.example": "A=1\n"}
        },
    )
    assert response.status_code == 200
    assert response.json()["counts"]["warning"] == 1


def test_api_and_cli_share_the_engine(client, make_project):
    from compose_env_guard.scanner import ScanOptions, scan_project

    # No env_file here: the API cannot verify file existence, which is the one intended difference.
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    image: x:${TAG}\n    environment:\n      K: ${JWT}\n",
            ".env.sample": "TAG=1\nLEGACY=2\n",
        }
    )
    files = {
        "compose.yaml": (project / "compose.yaml").read_text(),
        ".env.sample": (project / ".env.sample").read_text(),
    }
    api_report = client.post("/api/v1/scan", json={"files": files}).json()
    local = json.loads(scan_project(project, ScanOptions(project_name="api-request")).model_dump_json())
    assert [(f["rule_id"], f["variable"], f["line"]) for f in api_report["findings"]] == [
        (f["rule_id"], f["variable"], f["line"]) for f in local["findings"]
    ]
    assert [f["rule_id"] for f in api_report["findings"]] == ["CEG001", "CEG004"]


def test_fail_on_is_honoured(client):
    files = {
        "compose.yaml": "services:\n  a:\n    environment:\n      A: ${A}\n",
        ".env.example": "A=1\nA=2\n",
    }
    passed = client.post("/api/v1/scan", json={"files": files, "fail_on": "error"}).json()
    failed = client.post("/api/v1/scan", json={"files": files, "fail_on": "warning"}).json()
    assert passed["status"] == "passed"
    assert failed["status"] == "failed"


def test_api_scan_reports_unverified_env_files_without_contents(client):
    response = client.post(
        "/api/v1/scan",
        json={"files": {"compose.yaml": "services:\n  a:\n    env_file: ./app.env\n"}},
    )
    report = response.json()
    assert [f["rule_id"] for f in report["findings"]] == ["CEG007"]
    assert "not included" in report["findings"][0]["message"]


def test_explicit_compose_and_template_selection(client):
    files = {
        "compose.yaml": "services:\n  a:\n    image: x\n",
        "compose.prod.yaml": "services:\n  b:\n    image: y\n",
        ".env.sample": "A=1\n",
    }
    response = client.post(
        "/api/v1/scan",
        json={"files": files, "compose_files": ["compose.prod.yaml"], "env_example": ".env.sample"},
    )
    assert response.status_code == 200
    assert response.json()["services"] == ["b"]


@pytest.mark.parametrize(
    "payload",
    [
        {"files": {}},
        {"files": {"../compose.yaml": "services: {}"}},
        {"files": {"/etc/compose.yaml": "services: {}"}},
        {"files": {"sub/compose.yaml": "services: {}"}},
        {"files": {"compose.txt": "services: {}"}},
        {"files": {".env": "A=1", "compose.yaml": "services: {}"}},
        {"files": {"..": "x"}},
        {"files": {"compose.yaml": 123}},
        {"files": {"compose.yaml": "services: {}"}, "unknown": True},
        {"files": {"compose.yaml": "services: {}"}, "fail_on": "panic"},
        {"files": {".env.example": "A=1"}},
        {"files": {"compose.yaml": "services: {}"}, "compose_files": ["other.yaml"]},
        {"files": {"compose.yaml": "services: {}"}, "env_example": "compose.yaml"},
        {"files": {"compose.yaml": "services: {}"}, "compose_files": "compose.yaml"},
    ],
)
def test_invalid_requests_are_422(client, payload):
    response = client.post("/api/v1/scan", json=payload)
    assert response.status_code == 422, response.text


def test_too_many_files_is_422(client):
    files = {"compose.yaml": "services: {}"}
    for i in range(25):
        files[f"compose.{i}.yaml"] = "services: {}"
    assert client.post("/api/v1/scan", json={"files": files}).status_code == 422


def test_oversized_single_file_is_422(client):
    files = {"compose.yaml": "services: {}\n" + "# x" * 200_000}
    assert client.post("/api/v1/scan", json={"files": files}).status_code == 422


def test_oversized_body_is_413(client):
    body = b'{"files": {"compose.yaml": "' + b"a" * (1024 * 1024 + 10) + b'"}}'
    response = client.post("/api/v1/scan", content=body, headers={"content-type": "application/json"})
    assert response.status_code == 413


def test_oversized_streamed_body_is_413_without_content_length(client):
    def chunks():
        yield b'{"files": {"compose.yaml": "'
        for _ in range(1100):
            yield b"a" * 1024
        yield b'"}}'

    response = client.post("/api/v1/scan", content=chunks(), headers={"content-type": "application/json"})
    assert response.status_code == 413


def test_invalid_json_is_422(client):
    response = client.post("/api/v1/scan", content=b"{not json", headers={"content-type": "application/json"})
    assert response.status_code == 422


def test_empty_body_is_422(client):
    assert client.post("/api/v1/scan", content=b"").status_code == 422


def test_validation_errors_do_not_echo_submitted_content(client):
    response = client.post(
        "/api/v1/scan",
        json={
            "files": {"compose.yaml": "services: {}\n", "../bad.yaml": f"K={SECRET}"},
            "fail_on": SECRET,
        },
    )
    assert response.status_code == 422
    assert SECRET not in response.text


def test_report_never_contains_submitted_values(client):
    files = {
        "compose.yaml": f"services:\n  a:\n    image: x:${{T:-{SECRET}}}\n    env_file: ./p.env\n",
        ".env.example": f"TOKEN={SECRET}\nBAD NAME={SECRET}\n",
    }
    response = client.post("/api/v1/scan", json={"files": files})
    assert response.status_code == 200
    assert SECRET not in response.text


def test_unexpected_server_error_is_a_generic_500(monkeypatch):
    import compose_env_guard.api as api_module

    def explode(_payload):
        raise RuntimeError(f"leaked {SECRET}")

    monkeypatch.setattr(api_module, "_run_scan", explode)
    client = TestClient(create_app(), raise_server_exceptions=False)
    response = client.post("/api/v1/scan", json={"files": {"compose.yaml": "services: {}"}})
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error."}
    assert SECRET not in response.text


def test_scan_uses_no_persistent_storage(client, tmp_path, monkeypatch):
    import tempfile

    monkeypatch.setattr(tempfile, "tempdir", str(tmp_path))
    client.post("/api/v1/scan", json={"files": {"compose.yaml": "services: {}"}})
    assert list(tmp_path.iterdir()) == []
