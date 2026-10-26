"""Reads variable *names* from dotenv-style files.

Values are parsed by python-dotenv only so that the syntax matches what
dotenv tooling accepts. They are never expanded, stored or returned: each
binding is inspected for its key and line number and then dropped.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from typing import Literal

from dotenv.parser import parse_stream

from .security import VALID_VARIABLE_NAME

# A line that looks like "<something> = ..." but was rejected by the parser (e.g. spaces in the name).
_NAME_LIKE = re.compile(r"^\s*(?:export\s+)?([^=#\n]+?)\s*=")


@dataclass(frozen=True)
class DotenvKey:
    name: str
    line: int


@dataclass(frozen=True)
class DotenvProblem:
    kind: Literal["empty_name", "invalid_name", "invalid_line"]
    line: int
    name: str | None = None  # only set when the name is valid and safe to echo


@dataclass
class DotenvDocument:
    keys: list[DotenvKey] = field(default_factory=list)
    problems: list[DotenvProblem] = field(default_factory=list)

    @property
    def names(self) -> set[str]:
        return {key.name for key in self.keys}


def parse_dotenv(text: str) -> DotenvDocument:
    """Parse dotenv ``text`` into key names with line numbers and syntax problems."""
    doc = DotenvDocument()
    cursor = 0
    for binding in parse_stream(io.StringIO(text)):
        # python-dotenv does not count blank lines, so derive the line from the raw text.
        line = binding.original.line if binding.original is not None else 0
        raw_text = (binding.original.string if binding.original is not None else "").lstrip("\r\n")
        if raw_text:
            found = text.find(raw_text, cursor)
            if found >= 0:
                line = text.count("\n", 0, found) + 1
                cursor = found + len(raw_text)
        if binding.error:
            raw = (binding.original.string if binding.original is not None else "").lstrip()
            # Only the *shape* of the line is inspected; its content is not reported.
            if raw.startswith("="):
                kind = "empty_name"
            elif _NAME_LIKE.match(raw):
                kind = "invalid_name"
            else:
                kind = "invalid_line"
            doc.problems.append(DotenvProblem(kind=kind, line=line))
            continue
        key = binding.key
        if key is None:  # blank line or comment
            continue
        if not VALID_VARIABLE_NAME.match(key):
            doc.problems.append(DotenvProblem(kind="invalid_name", line=line))
            continue
        doc.keys.append(DotenvKey(name=key, line=line))
    return doc
