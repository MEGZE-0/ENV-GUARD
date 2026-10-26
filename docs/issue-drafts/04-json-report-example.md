---
title: "Good first issue: add a JSON report example to docs/json-report.md"
labels: ["good first issue", "documentation"]
---

## What to do

`docs/json-report.md` explains the fields but has no full example. Run the scanner on `examples/broken-project` with `composeguard scan examples/broken-project --format json`, then add one trimmed example to the document.

Keep the example unedited apart from trimming, so it matches real output.

## Acceptance criteria

- The example is copied from real output and is valid JSON.
- It contains no absolute paths and no environment values.
- The document still links to `report.schema.json`.
