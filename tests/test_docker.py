"""Docker smoke tests. They run only when a Docker daemon is reachable."""

import shutil
import subprocess

import pytest

from conftest import EXAMPLES, REPO_ROOT

IMAGE = "compose-env-guard:pytest"


def _docker_available() -> bool:
    if shutil.which("docker") is None:
        return False
    probe = subprocess.run(["docker", "info"], capture_output=True, text=True, timeout=30, check=False)
    return probe.returncode == 0


pytestmark = [
    pytest.mark.docker,
    pytest.mark.skipif(not _docker_available(), reason="Docker daemon is not available"),
]


@pytest.fixture(scope="module")
def image():
    build = subprocess.run(
        ["docker", "build", "-t", IMAGE, str(REPO_ROOT)],
        capture_output=True,
        text=True,
        timeout=900,
        check=False,
    )
    assert build.returncode == 0, build.stderr[-2000:]
    return IMAGE


def test_container_scans_healthy_example_from_read_only_mount(image):
    run = subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "--network",
            "none",
            "-v",
            f"{EXAMPLES / 'healthy-project'}:/workspace:ro",
            image,
            "scan",
            "/workspace",
        ],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    assert run.returncode == 0, run.stdout + run.stderr
    assert "Final status: Passed" in run.stdout


def test_container_reports_broken_example_with_exit_code_one(image):
    run = subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "--network",
            "none",
            "-v",
            f"{EXAMPLES / 'broken-project'}:/workspace:ro",
            image,
            "scan",
            "/workspace",
        ],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    assert run.returncode == 1
    assert "CEG003" in run.stdout
