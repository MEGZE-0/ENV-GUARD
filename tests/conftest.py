"""Shared pytest helpers."""

from __future__ import annotations

import functools
import os
import tempfile
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
EXAMPLES = REPO_ROOT / "examples"


def write_project(root: Path, files: dict[str, str | bytes]) -> Path:
    """Create files under ``root`` (a directory created on demand)."""
    root.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            target.write_bytes(content)
        else:
            target.write_text(content, encoding="utf-8")
    return root


@pytest.fixture
def make_project(tmp_path: Path):
    """Factory: ``make_project({"compose.yaml": "...", ".env.example": "..."}) -> Path``."""
    counter = {"n": 0}

    def _make(files: dict[str, str | bytes], name: str | None = None) -> Path:
        counter["n"] += 1
        return write_project(tmp_path / (name or f"project-{counter['n']}"), files)

    return _make


@functools.cache
def can_symlink() -> bool:
    if not hasattr(os, "symlink"):
        return False
    try:
        with tempfile.TemporaryDirectory(prefix="composeguard-symlink-test-") as td:
            src = Path(td) / "probe_src"
            src.touch()
            dst = Path(td) / "probe_dst"
            dst.symlink_to(src)
            return True
    except OSError:
        return False


def rule_ids(report) -> list[str]:
    return [f.rule_id for f in report.findings]


def findings_for(report, rule_id: str):
    return [f for f in report.findings if f.rule_id == rule_id]
