"""Adversarial and privacy tests: boundaries, symlinks, limits, encoding, redaction."""

import os
from pathlib import Path

import pytest

from compose_env_guard.scanner import ScanOptions, scan_project
from compose_env_guard.security import (
    ProjectPathError,
    ProjectRoot,
    ScanInputError,
    UnsafeNameError,
    safe_display_name,
    validate_api_filename,
)
from conftest import can_symlink, findings_for

SECRET = "TOP-SECRET-sentinel-7d41"
needs_symlink = pytest.mark.skipif(not can_symlink(), reason="symlinks not supported")


def scan(path, **kwargs):
    return scan_project(path, ScanOptions(**kwargs))


# -- ProjectRoot path resolution ---------------------------------------------------


@pytest.mark.parametrize(
    "rel",
    [
        "/etc/passwd",
        "../outside.yaml",
        "a/../../outside.yaml",
        "..",
        "C:\\x.yaml",
        "\\\\server\\share",
        "",
        "bad\x00name",
    ],
)
def test_paths_that_escape_the_root_are_rejected(make_project, rel):
    root = ProjectRoot(make_project({"compose.yaml": "services: {}\n"}))
    assert root.resolve(rel)[0] is None


def test_nested_dotdot_that_stays_inside_is_allowed(make_project):
    project = make_project({"sub/compose.yaml": "services: {}\n"})
    root = ProjectRoot(project)
    assert root.resolve("sub/../sub/compose.yaml")[0] == "sub/compose.yaml"


def test_project_root_must_exist_and_be_a_directory(tmp_path):
    with pytest.raises(ScanInputError, match="does not exist"):
        ProjectRoot(tmp_path / "missing")
    file_path = tmp_path / "f.txt"
    file_path.write_text("x")
    with pytest.raises(ScanInputError, match="not a directory"):
        ProjectRoot(file_path)


def test_read_text_enforces_size_limit(make_project):
    project = make_project({"big.txt": "x" * 100})
    with pytest.raises(ProjectPathError, match="byte limit"):
        ProjectRoot(project).read_text("big.txt", 50)


def test_read_text_rejects_invalid_utf8(make_project):
    project = make_project({"bad.txt": b"\xff\xfe"})
    with pytest.raises(ProjectPathError, match="UTF-8"):
        ProjectRoot(project).read_text("bad.txt", 1000)


# -- CLI-supplied paths ------------------------------------------------------------


@pytest.mark.parametrize(
    "option",
    [
        {"compose_files": ["../outside.yaml"]},
        {"compose_files": ["/etc/passwd"]},
        {"compose_files": ["compose.txt"]},
        {"include_env_files": ["../secret.env"]},
        {"include_env_files": ["/etc/hosts"]},
        {"config_path": "../x.yaml"},
    ],
)
def test_cli_supplied_paths_must_stay_inside_the_project(make_project, option):
    project = make_project({"compose.yaml": "services: {}\n", "compose.txt": "services: {}\n"})
    with pytest.raises(ScanInputError):
        scan(project, **option)


def test_env_example_outside_project_is_rejected(make_project):
    project = make_project({"compose.yaml": "services: {}\n"})
    with pytest.raises(ScanInputError, match="not found"):
        scan(project, env_example="../.env.example")


def test_too_many_explicit_compose_files_is_rejected(make_project):
    files = {f"c{i}.yaml": "services: {}\n" for i in range(11)}
    project = make_project(files)
    with pytest.raises(ScanInputError, match="Too many"):
        scan(project, compose_files=list(files))


def test_compose_discovery_does_not_walk_subdirectories(make_project):
    project = make_project({"nested/compose.yaml": "services: {}\n", "README.md": "x"})
    with pytest.raises(ScanInputError, match="No Compose file found"):
        scan(project)


def test_scan_never_modifies_the_project(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    env_file: ./x.env\n    environment:\n      A: ${A}\n",
            ".env.example": "A=1\n",
            "x.env": f"Q={SECRET}\n",
        }
    )

    def snapshot():
        result = {}
        for dirpath, _dirs, names in os.walk(project):
            for name in names:
                full = Path(dirpath) / name
                result[str(full.relative_to(project))] = (full.stat().st_mtime_ns, full.read_bytes())
        return result

    before = snapshot()
    scan(project)
    assert snapshot() == before


# -- symlinks and files outside the boundary ------------------------------------------


@needs_symlink
def test_env_file_symlink_to_outside_is_never_followed(make_project, tmp_path):
    outside = tmp_path / "outside.env"
    outside.write_text(f"LEAK={SECRET}\n")
    project = make_project(
        {
            "compose.yaml": "services:\n  api:\n    env_file: ./link.env\n    environment:\n      A: ${A}\n",
            ".env.example": "A=1\n",
        }
    )
    os.symlink(outside, project / "link.env")
    report = scan(project)
    text = report.model_dump_json()
    assert SECRET not in text
    assert "CEG003" not in [f.rule_id for f in report.findings]
    warnings = [f for f in findings_for(report, "CEG005") if "outside" in f.message]
    assert warnings and warnings[0].severity.value == "warning"


@needs_symlink
def test_env_file_traversal_is_never_read(make_project, tmp_path):
    outside = tmp_path / "shared.env"
    outside.write_text(f"LEAK={SECRET}\n")
    project = make_project(
        {"sub/compose.yaml": "services:\n  api:\n    env_file: ../../shared.env\n"},
    )
    report = scan(project, compose_files=["sub/compose.yaml"])
    assert SECRET not in report.model_dump_json()
    assert any("outside" in f.message for f in findings_for(report, "CEG005"))


@needs_symlink
def test_symlinked_compose_pointing_outside_is_refused(make_project, tmp_path):
    outside = tmp_path / "evil.yaml"
    outside.write_text(f"services:\n  api:\n    environment:\n      K: {SECRET}\n")
    project = make_project({"placeholder": "x"})
    os.symlink(outside, project / "compose.yaml")
    with pytest.raises(ScanInputError) as info:
        scan(project)
    assert SECRET not in str(info.value)


@needs_symlink
def test_explicit_compose_through_symlinked_directory_is_refused(make_project, tmp_path):
    outside_dir = tmp_path / "elsewhere"
    outside_dir.mkdir()
    (outside_dir / "compose.yaml").write_text("services: {}\n")
    project = make_project({"placeholder": "x"})
    os.symlink(outside_dir, project / "linked")
    with pytest.raises(ScanInputError, match="inside the project"):
        scan(project, compose_files=["linked/compose.yaml"])


@needs_symlink
def test_symlink_that_stays_inside_the_project_is_allowed(make_project):
    project = make_project({"real/compose.yaml": "services:\n  a:\n    image: x\n"})
    os.symlink(project / "real" / "compose.yaml", project / "alias.yaml")
    report = scan(project, compose_files=["alias.yaml"])
    assert report.services == ["a"]


@needs_symlink
def test_config_symlink_outside_is_refused(make_project, tmp_path):
    outside = tmp_path / "cfg.yaml"
    outside.write_text("version: 1\n")
    project = make_project({"compose.yaml": "services: {}\n"})
    os.symlink(outside, project / ".composeguard.yaml")
    report = scan(project)  # discovered config outside is ignored as if absent
    assert report.files and all(f.role != "config" for f in report.files)


# -- size limits and bad inputs -------------------------------------------------------------


def test_oversized_compose_file_is_skipped_with_an_error(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    image: x\n" + "# padding\n" * 500,
            "docker-compose.yml": "services:\n  a:\n    image: x\n",
        }
    )
    report = scan(project, compose_files=["compose.yaml", "docker-compose.yml"], max_compose_bytes=200)
    errors = [f for f in findings_for(report, "CEG005") if f.file == "compose.yaml"]
    assert errors and errors[0].severity.value == "error"
    assert [s.path for s in report.skipped] == ["compose.yaml"]
    assert report.services == ["a"]


def test_single_oversized_compose_file_stops_the_scan(make_project):
    project = make_project({"compose.yaml": "services:\n  a:\n    image: x\n" + "#\n" * 500})
    with pytest.raises(ScanInputError, match="byte limit"):
        scan(project, max_compose_bytes=100)


def test_oversized_template_is_not_analyzed_and_rules_are_skipped(make_project):
    project = make_project(
        {
            "compose.yaml": "services:\n  a:\n    image: x:${TAG}\n",
            ".env.example": "TAG=1\n" + "X=1\n" * 500,
        }
    )
    report = scan(project, max_env_bytes=100)
    assert any("byte limit" in f.message for f in findings_for(report, "CEG005"))
    assert not {"CEG001", "CEG002", "CEG004"} & {f.rule_id for f in report.findings}
    assert any("could not be analyzed" in n for n in report.notes)


def test_invalid_utf8_template_is_reported(make_project):
    project = make_project({"compose.yaml": "services:\n  a:\n    image: x\n", ".env.example": b"A=\xff\n"})
    report = scan(project)
    error = [f for f in findings_for(report, "CEG005") if f.file == ".env.example"]
    assert error and "UTF-8" in error[0].message


def test_directory_named_like_compose_is_not_a_compose_file(make_project):
    project = make_project({"compose.yaml/inner.txt": "x", "docker-compose.yml": "services: {}\n"})
    report = scan(project)
    assert [f.path for f in report.files if f.role == "compose"] == ["docker-compose.yml"]


# -- redaction -------------------------------------------------------------------------------


def test_secret_values_never_appear_in_any_output_format(make_project, tmp_path):
    project = make_project(
        {
            "compose.yaml": (
                f"services:\n  api:\n    env_file: ./private.env\n"
                f"    image: app:${{TAG:-{SECRET}}}\n"
                f"    environment:\n      - KEY={SECRET}\n      - BAD NAME={SECRET}\n"
                f"      MAP: ${{INTERP:-{SECRET}}}\n"
                f"      LIST_VALUE:\n        - {SECRET}\n"
            ),
            ".env.example": f"TOKEN={SECRET}\nBROKEN LINE {SECRET}\n=={SECRET}\n",
            "private.env": f"PRIVATE={SECRET}\n",
            ".env": f"DOTENV={SECRET}\n",
        }
    )
    report = scan(project)
    import io

    from rich.console import Console

    from compose_env_guard.reporters import print_terminal, render_json, render_markdown

    buffer = io.StringIO()
    print_terminal(report, Console(file=buffer, width=120, color_system=None))
    outputs = [render_json(report), render_markdown(report), buffer.getvalue()]
    for text in outputs:
        assert SECRET not in text


def test_malformed_yaml_error_never_echoes_the_secret(make_project):
    project = make_project({"compose.yaml": f"services:\n  api:\n    environment: [{SECRET}\n"})
    report = scan(project)
    assert SECRET not in report.model_dump_json()


def test_safe_display_name_masks_unusual_names():
    assert safe_display_name("GOOD_NAME") == "GOOD_NAME"
    assert safe_display_name(f"BAD {SECRET}") == "<invalid name>"


@pytest.mark.parametrize(
    "name",
    [
        "../x.yaml",
        "/abs.yaml",
        "dir/compose.yaml",
        "compose.txt",
        ".env",
        "C:x.yaml",
        "..",
        ".",
        "a" * 200,
        "compose\\x.yaml",
    ],
)
def test_api_filename_validation_rejects_unsafe_names(name):
    with pytest.raises(UnsafeNameError):
        validate_api_filename(name)


@pytest.mark.parametrize(
    "name",
    [
        "compose.yaml",
        "compose.yml",
        "docker-compose.yaml",
        "docker-compose.prod.yml",
        "compose.dev-1.yaml",
        ".env.example",
        ".env.sample",
        ".composeguard.yaml",
    ],
)
def test_api_filename_validation_accepts_known_names(name):
    assert validate_api_filename(name) == name
