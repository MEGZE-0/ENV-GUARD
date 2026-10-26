---
title: "Help wanted: report whether the scanner runs on Windows"
labels: ["help wanted", "platform", "testing"]
---

## What to do

ComposeEnvGuard has been developed and tested on Linux. We want to know whether the test suite and the CLI work on Windows with PowerShell.

Steps:

1. Create a virtual environment and install with `python -m pip install ".[dev]"`.
2. Run `python -m pytest -q` and `composeguard scan examples/broken-project`.
3. Post the final lines of the output (no paths you consider private) in this issue.

## Acceptance criteria

- The issue contains the Python version, Windows version and the pytest summary line.
- If something fails, attach the failing test name only. Do not paste any local environment values.
