"""Parser for Docker Compose variable interpolation syntax.

This module only *extracts* variable references. It never evaluates or expands
them, and it never looks at values from any environment.

Supported forms (see the Compose specification):

* ``$$``                      literal dollar sign (escape)
* ``$VAR`` / ``${VAR}``       plain reference
* ``${VAR:-d}`` / ``${VAR-d}``  default when unset (or empty / unset)
* ``${VAR:?e}`` / ``${VAR?e}``  required (error when unset)
* ``${VAR:+a}`` / ``${VAR+a}``  alternative when set
* Nested references inside default/alternative/error text, e.g. ``${A:-${B:-x}}``.
"""

from __future__ import annotations

from dataclasses import dataclass

_NAME_START = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_")
_NAME_CHARS = _NAME_START | frozenset("0123456789")
_MAX_DEPTH = 16

OPERATORS = (":-", "-", ":?", "?", ":+", "+")


class InterpolationSyntaxError(ValueError):
    """Raised for interpolation that Compose itself would reject.

    The message deliberately contains only a character offset, never the text
    of the expression, because that text may contain default values.
    """

    def __init__(self, offset: int) -> None:
        super().__init__(f"invalid interpolation syntax at character offset {offset}")
        self.offset = offset


@dataclass(frozen=True)
class InterpolationRef:
    """A variable reference found in a Compose value."""

    name: str
    operator: str | None = None  # None for plain references

    @property
    def has_default(self) -> bool:
        """True when Compose falls back to a literal default if the variable is unset."""
        return self.operator in (":-", "-")

    @property
    def is_required(self) -> bool:
        """True when Compose aborts if the variable is unset (``:?`` / ``?``)."""
        return self.operator in (":?", "?")


def parse_references(text: str) -> list[InterpolationRef]:
    """Return all variable references in ``text``, in order of appearance.

    Nested references (inside defaults) are included. Raises
    :class:`InterpolationSyntaxError` for malformed input.
    """
    return _parse(text, 0, 0)


def contains_interpolation(text: str) -> bool:
    """Cheap check: does the string contain any interpolation reference?"""
    return "$" in text and bool(parse_references(text))


def _parse(text: str, base: int, depth: int) -> list[InterpolationRef]:
    if depth > _MAX_DEPTH:
        raise InterpolationSyntaxError(base)
    refs: list[InterpolationRef] = []
    i = 0
    n = len(text)
    while i < n:
        if text[i] != "$":
            i += 1
            continue
        nxt = text[i + 1] if i + 1 < n else ""
        if nxt == "$":  # escaped dollar: "$$" -> literal "$"
            i += 2
            continue
        if nxt == "{":
            end = _find_closing_brace(text, i + 2, base + i)
            refs.extend(_parse_braced(text[i + 2 : end], base + i + 2, depth))
            i = end + 1
            continue
        if nxt in _NAME_START:
            j = i + 1
            while j < n and text[j] in _NAME_CHARS:
                j += 1
            refs.append(InterpolationRef(text[i + 1 : j]))
            i = j
            continue
        # A lone "$" followed by anything else is rejected by Compose.
        raise InterpolationSyntaxError(base + i)
    return refs


def _find_closing_brace(text: str, start: int, error_offset: int) -> int:
    """Index of the ``}`` closing a ``${`` whose body starts at ``start``."""
    depth = 0
    i = start
    n = len(text)
    while i < n:
        ch = text[i]
        if ch == "$" and i + 1 < n:
            nxt = text[i + 1]
            if nxt == "$":
                i += 2
                continue
            if nxt == "{":
                depth += 1
                i += 2
                continue
        if ch == "}":
            if depth == 0:
                return i
            depth -= 1
        i += 1
    raise InterpolationSyntaxError(error_offset)


def _parse_braced(body: str, base: int, depth: int) -> list[InterpolationRef]:
    if not body or body[0] not in _NAME_START:
        raise InterpolationSyntaxError(base)
    j = 1
    while j < len(body) and body[j] in _NAME_CHARS:
        j += 1
    name = body[:j]
    rest = body[j:]
    if rest == "":
        return [InterpolationRef(name)]
    operator: str | None = None
    if rest.startswith(":") and rest[:2] in OPERATORS:
        operator = rest[:2]
    elif rest[:1] in OPERATORS and not rest.startswith(":"):
        operator = rest[:1]
    if operator is None:
        raise InterpolationSyntaxError(base + j)
    argument = rest[len(operator) :]
    nested = _parse(argument, base + j + len(operator), depth + 1)
    return [InterpolationRef(name, operator), *nested]
