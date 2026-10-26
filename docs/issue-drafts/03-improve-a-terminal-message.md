---
title: "Good first issue: make one CEG005 message clearer for beginners"
labels: ["good first issue", "documentation", "ux"]
---

## What to do

Several CEG005 messages are written for maintainers. Choose one message in `src/compose_env_guard/compose_parser.py` or `dotenv_parser.py`, and rewrite its `problem` and `suggestion` in plain language, for someone who has used Compose but not YAML anchors.

Keep these rules: the message must not include environment values or source text from the file, and the line number must still be reported.

## Acceptance criteria

- The message is clearer and keeps the same rule ID and severity.
- Any test that matches the old text is updated.
- The full test suite and `ruff check .` pass.
