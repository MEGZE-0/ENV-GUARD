---
title: "Good first issue: document a variable in examples/broken-project/.env.sample"
labels: ["good first issue", "documentation"]
---

## What to do

`composeguard scan examples/broken-project` reports `CEG001` for `JWT_SECRET`, which is used in `compose.yaml` but not documented in `.env.sample`.

Add a documented entry for `JWT_SECRET` with an **invented placeholder** value and a comment that explains its purpose. Do not add a real secret. Then re-run the scan and confirm the CEG001 finding disappears.

## Acceptance criteria

- `.env.sample` documents `JWT_SECRET` with a placeholder such as `change-me`.
- The scan of `examples/broken-project` no longer reports CEG001 for `JWT_SECRET`.
- The other expected findings still appear, so the example keeps demonstrating the rules.
