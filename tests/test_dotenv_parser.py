import dataclasses

from compose_env_guard.dotenv_parser import DotenvKey, parse_dotenv


def test_keys_have_names_and_lines():
    doc = parse_dotenv("# comment\nA=1\n\nexport B='two'\nC\n")
    assert [(k.name, k.line) for k in doc.keys] == [("A", 2), ("B", 4), ("C", 5)]
    assert doc.problems == []


def test_duplicates_are_preserved_for_the_rules_to_report():
    doc = parse_dotenv("LOG=info\nLOG=debug\n")
    assert [k.line for k in doc.keys if k.name == "LOG"] == [1, 2]


def test_empty_name_and_invalid_lines_are_classified():
    doc = parse_dotenv("=value-without-name\nBAD NAME=1\nMY-VAR=2\n1X=3\nthis is not valid\n")
    kinds = [(p.kind, p.line) for p in doc.problems]
    assert ("empty_name", 1) in kinds
    assert ("invalid_name", 3) in kinds  # hyphen is not a valid identifier
    assert ("invalid_name", 4) in kinds
    assert any(k == "invalid_line" for k, _ in kinds)
    assert doc.keys == []


def test_problem_records_never_contain_the_offending_text():
    secret = "hunter2-very-secret"
    doc = parse_dotenv(f"BAD NAME={secret}\n={secret}\nNOT VALID {secret}\n")
    for problem in doc.problems:
        assert secret not in repr(problem)
        assert problem.name is None


def test_records_hold_no_value_field():
    assert [f.name for f in dataclasses.fields(DotenvKey)] == ["name", "line"]


def test_unicode_values_and_bom_are_handled():
    doc = parse_dotenv("GREETING='héllo 世界'\nEMOJI=🚀\n")
    assert [k.name for k in doc.keys] == ["GREETING", "EMOJI"]
