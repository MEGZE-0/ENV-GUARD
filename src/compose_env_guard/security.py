"""File-boundary checks, size limits, safe reading and name validation.

Everything that touches the filesystem on behalf of a scan goes through this module.
"""

from __future__ import annotations

import os
import posixpath
import re
from dataclasses import dataclass
from pathlib import Path

# Size and count limits (bytes unless stated).
MAX_COMPOSE_FILE_BYTES = 1024 * 1024
MAX_ENV_FILE_BYTES = 256 * 1024
MAX_CONFIG_FILE_BYTES = 64 * 1024
MAX_COMPOSE_FILES = 10
MAX_ENV_FILE_READS = 50

# API limits.
API_MAX_REQUEST_BYTES = 1024 * 1024
API_MAX_FILES = 20
API_MAX_FILE_BYTES = 256 * 1024

COMPOSE_NAMES = ("compose.yaml", "compose.yml", "docker-compose.yml", "docker-compose.yaml")
TEMPLATE_NAMES = (".env.example", ".env.sample")
CONFIG_NAMES = (".composeguard.yaml", ".composeguard.yml")
PRIVATE_DEFAULT_NAMES = (".env",)

VALID_VARIABLE_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,127}$")
_SAFE_DISPLAY_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_.\-]{0,127}$")
_API_COMPOSE_NAME = re.compile(r"^(compose|docker-compose)(\.[A-Za-z0-9_-]{1,64})?\.(yaml|yml)$")
_API_TEMPLATE_NAME = re.compile(r"^\.env\.(example|sample)$")
_API_CONFIG_NAME = re.compile(r"^\.composeguard\.(yaml|yml)$")


class ProjectPathError(Exception):
    """A path is outside the project boundary or otherwise unsafe to read."""


class ScanInputError(Exception):
    """User input prevents a reliable scan (exit code 2 in the CLI)."""


class UnsafeNameError(ValueError):
    """An API-supplied file name is not allowed."""


def safe_display_name(name: str) -> str:
    """Return ``name`` if it is a plausible variable name, otherwise a placeholder.

    Used anywhere a name taken from user content is echoed, so that malformed
    lines (which may contain secret values) are never reflected in reports.
    """
    if _SAFE_DISPLAY_NAME.match(name):
        return name
    return "<invalid name>"


def to_posix_relative(path: str) -> str:
    """Normalise a relative path string to posix form without touching the filesystem."""
    return posixpath.normpath(path.replace("\\", "/"))


def is_within(child: str, parent: str) -> bool:
    try:
        return os.path.commonpath([child, parent]) == parent
    except ValueError:
        return False


@dataclass(frozen=True)
class ProjectFile:
    """A regular file located inside the project root."""

    rel: str  # posix path relative to project root, e.g. "config/app.env"
    real: str  # resolved absolute path (symlinks followed, still inside root)


class ProjectRoot:
    """Boundary helper for a project directory."""

    def __init__(self, root: str | Path) -> None:
        path = Path(root)
        if not path.exists():
            raise ScanInputError(f"Project path does not exist: {root}")
        if not path.is_dir():
            raise ScanInputError(f"Project path is not a directory: {root}")
        self.real_root = os.path.realpath(path)

    def resolve(self, rel: str, base_dir: str = ".") -> tuple[str | None, str]:
        """Resolve ``rel`` (relative to ``base_dir``) against the root.

        Returns ``(rel_path, real_path)``. ``rel_path`` is None when the target
        falls outside the project boundary (including via symlinks). Never raises
        for "missing" files; callers check existence.
        """
        if not rel or "\x00" in rel:
            return None, ""
        if os.path.isabs(rel) or rel.startswith(("/", "\\")) or re.match(r"^[A-Za-z]:", rel):
            return None, ""
        joined = to_posix_relative(posixpath.join(base_dir, rel.replace("\\", "/")))
        if joined == ".." or joined.startswith("../"):
            return None, ""
        real = os.path.realpath(os.path.join(self.real_root, joined))
        if not is_within(real, self.real_root):
            return None, ""
        return joined, real

    def read_text(self, rel: str, max_bytes: int) -> str:
        """Read a UTF-8 text file inside the project. Raises ProjectPathError on failure."""
        rel_path, real = self.resolve(rel)
        if rel_path is None:
            raise ProjectPathError("resolves outside the project boundary")
        if not os.path.isfile(real):
            raise ProjectPathError("not a regular file")
        size = os.path.getsize(real)
        if size > max_bytes:
            raise ProjectPathError(f"exceeds the {max_bytes} byte limit")
        with open(real, "rb") as handle:
            data = handle.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise ProjectPathError(f"exceeds the {max_bytes} byte limit")
        try:
            return data.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ProjectPathError("is not valid UTF-8") from exc

    def exists(self, rel: str) -> tuple[bool, bool]:
        """Return ``(inside_boundary, exists_as_file)``."""
        rel_path, real = self.resolve(rel)
        if rel_path is None:
            return False, False
        return True, os.path.isfile(real)


def validate_api_filename(name: str) -> str:
    """Accept only root-level, known Compose / template / config filenames for the API."""
    if not isinstance(name, str) or not name or len(name) > 128:
        raise UnsafeNameError("file name must be a non-empty string of at most 128 characters")
    if any(ch in name for ch in ("/", "\\", "\x00", ":")) or name in (".", ".."):
        raise UnsafeNameError("file names must be plain names without directories")
    if _API_COMPOSE_NAME.match(name) or _API_TEMPLATE_NAME.match(name) or _API_CONFIG_NAME.match(name):
        return name
    raise UnsafeNameError("file name is not an allowed Compose, template or config file name")
