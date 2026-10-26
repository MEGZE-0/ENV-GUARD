import pytest

from compose_env_guard.interpolation import (
    InterpolationSyntaxError,
    contains_interpolation,
    parse_references,
)


def names(text):
    return [(r.name, r.operator) for r in parse_references(text)]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("$VAR", [("VAR", None)]),
        ("${VAR}", [("VAR", None)]),
        ("myapp:${IMAGE_TAG}", [("IMAGE_TAG", None)]),
        ("${A:-fallback}", [("A", ":-")]),
        ("${A-fallback}", [("A", "-")]),
        ("${A:?must be set}", [("A", ":?")]),
        ("${A?must be set}", [("A", "?")]),
        ("${A:+alt}", [("A", ":+")]),
        ("${A+alt}", [("A", "+")]),
        ("_under_score9", []),
        ("$_private", [("_private", None)]),
        ("plain text", []),
        ("", []),
    ],
)
def test_forms(text, expected):
    assert names(text) == expected


def test_escaped_dollars_are_not_references():
    assert names("$$VAR") == []
    assert names("cost: $$${AMOUNT}") == [("AMOUNT", None)]
    assert names("$${NOT_A_REF}") == []  # "$$" escapes the dollar, the braces are literal


def test_nested_default_references_are_found_in_order():
    assert names("${A:-${B:-x}}") == [("A", ":-"), ("B", ":-")]
    assert names("${A:-$C}") == [("A", ":-"), ("C", None)]
    assert names("${A:-prefix-${B}-suffix}") == [("A", ":-"), ("B", None)]


def test_escaped_dollar_inside_default_is_literal():
    assert names("${A:-$$B}") == [("A", ":-")]


def test_default_containing_braces_is_balanced():
    assert names("${A:-{json}}") == [("A", ":-")]


@pytest.mark.parametrize(
    "text",
    [
        "$",
        "price $ 5",
        "$5",
        "${",
        "${A",
        "${1BAD}",
        "${A:}",
        "${A:x}",
        "${}",
        "${A:-${B:-unclosed}",
    ],
)
def test_invalid_syntax_raises(text):
    with pytest.raises(InterpolationSyntaxError):
        parse_references(text)


def test_error_message_never_echoes_the_expression():
    secret = "sup3r-s3cret-default"
    with pytest.raises(InterpolationSyntaxError) as info:
        parse_references(f"${{A:-{secret}}}${{")
    assert secret not in str(info.value)


def test_contains_interpolation():
    assert contains_interpolation("${A}")
    assert not contains_interpolation("$$A")
    assert not contains_interpolation("no dollars")


def test_reference_properties():
    default_ref, required_ref, alt_ref = parse_references("${A:-x}${B?e}${C:+y}")
    assert default_ref.has_default and not default_ref.is_required
    assert required_ref.is_required and not required_ref.has_default
    assert not alt_ref.has_default and not alt_ref.is_required
