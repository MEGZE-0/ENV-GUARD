# Contributing to ComposeEnvGuard

Thank you for helping. This project is small on purpose, so changes are reviewed carefully. Please read the rules below before opening a pull request.

## Ground rules

- **Never print or store environment values.** Test data must use invented values. Messages must use names, line numbers and fixed text only.
- **Keep scans read-only and local.** No network access, telemetry, shell execution, or evaluation of values.
- **Warnings must not fail CI by default.** Only errors fail with the default `--fail-on error`.
- **Do not overstate certainty.** A finding that depends on something the scanner cannot see must say so in its uncertainty note.
- **One engine.** The CLI, API and Action must call `scanner.scan_project`. Do not copy logic into an entry point.

## Development setup

Requires Python 3.11 or newer.

```bash
python -m venv .venv
. .venv/bin/activate                 # Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
```

## Checks to run before opening a pull request

```bash
ruff check .
ruff format --check .
python -m pytest -q --cov=compose_env_guard
python -m build
```

- The coverage gate is 85%. Core parsing and rule modules are expected to have higher coverage.
- Docker tests run only when a Docker daemon is available and are skipped otherwise. Do not remove the skip.
- Every bug fix needs a regression test that fails before the fix.

## Adding or changing a rule

1. Choose the next unused rule ID. IDs are never reused.
2. Add the rule to `RULES` in `rules.py` with a title, default severity and description.
3. Write tests for both positive and negative cases, including the uncertainty text.
4. Update `docs/rules.md` and the README table, and add a CHANGELOG entry. The test suite fails if a rule is undocumented.

## Changing the report format

- Keep `schema_version` unless the change removes or renames a field. Additive changes are allowed.
- Regenerate the schema after model changes:

  ```bash
  python -c "import json; from compose_env_guard.models import Report; print(json.dumps(Report.model_json_schema(), indent=2))" > docs/report.schema.json
  ```

  `tests/test_action_and_packaging.py` fails when the committed schema is stale.

## Commit and pull request style

- Keep commits focused. Use imperative, present-tense messages ("Reject symlinks outside the project").
- Fill in the pull request template, including the test results you actually ran.
- Do not commit generated folders: `dist/`, `build/`, `.venv*/`, `.coverage`, or report outputs.

## Code style

- Python 3.11+, type hints on public functions, Ruff for linting and formatting (line length 110).
- Keep dependencies minimal. New runtime dependencies need a strong reason in the pull request description.

## Reporting problems

- Bugs: use the bug-report template. Attach a minimal, sanitised project.
- Security issues: see [SECURITY.md](SECURITY.md). Do not use public issues.

By contributing you agree that your contribution is released under the MIT license in [LICENSE](LICENSE).
