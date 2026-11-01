# Audit baseline — 2026-11-01

- Original checkout: clean `feature/v0.2.0-dashboard`, commit `1cca276ab19842ebf46a4a82107adb8083fc6bfa`; preserved untouched.
- Isolated worktree: `E:/github/ENV-GUARD-audit`, branch `codex/v0.2.0-audit-and-improvements`.
- Base: `origin/main` at `b542226d6339b5e5bf90d7e15b9bbb497eb62969`, confirmed by `git ls-remote` and fetch.
- Version: 0.1.0; Python >=3.11, CI claims 3.11–3.13. MIT license retained.
- Available interpreters: CPython 3.11.15 and 3.14.7 on Windows. Isolated development environment uses 3.11.15.
- Ruff 0.17.3: lint passes; format check passes (47 files).
- Full baseline pytest: 266 items collected, one collection error, no tests executed; Docker availability probe raises `TimeoutExpired` after 30 seconds instead of skipping. Coverage unavailable for that run.
- Docker client exists but daemon probe hangs. Container verification pending availability.
- GitHub CLI absent from PATH and standard installation path. Initial fetch failed transiently; subsequent Git access works.
- Released v0.1.0 tag exists locally; public release is labelled an initial preview/pre-release. No tags or releases modified.
- Wiki: fresh remote clone succeeds; 27 Markdown files (25 pages, sidebar, footer). Published Home exists. Remote documentation incorrectly advertises v0.2.0 and `serve --open`, absent from main.

This file records observations before implementation. Follow-up results and findings belong in the engineering report.
