---
title: "Good first issue: add a test for an interpolation operator"
labels: ["good first issue", "tests"]
---

## What to do

`tests/test_interpolation.py` covers the operators `:-`, `-`, `:?`, `?`, `:+`, `+`, `$$` and nested defaults. Pick one case that is not yet tested with an input that contains a multi-line or Unicode default, and add a test for it.

Read `src/compose_env_guard/interpolation.py` first and do not change the implementation in this issue. If the test shows a bug, open a separate issue with the minimal input.

## Acceptance criteria

- One new test function, named after the behaviour it checks.
- It uses invented values only.
- `python -m pytest -q tests/test_interpolation.py` passes and `ruff check .` is clean.
