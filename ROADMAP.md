# Roadmap

This roadmap lists intentions, not promises. Priorities change with feedback.

## Now (0.x, hardening)

- Verify the Docker image and the GitHub Action on real runners and record the results in the changelog.
- Collect real-world Compose files from volunteers (sanitised) and reduce false positives.
- Stabilise the JSON report schema before 1.0.
- Run the test suite on Windows and macOS.

## Next

- Support `extends` and `include` within the project directory, with explicit depth limits.
- Clearer handling of `docker-compose.override.yml` when several files are supplied.
- Optional SARIF output for code-scanning dashboards (report only; no upload from the tool).
- Configurable allow-lists for variables supplied by specific CI systems.

## Later (only if it stays local and read-only)

- Read-only check for Compose profiles.
- Pre-commit hook example.
- A small GitHub code-scanning example in the documentation.

## Explicitly out of scope

These are deliberately excluded to keep the project small and private:

- Accounts, hosted services, dashboards, payments, or telemetry.
- Inspection of secret values.
- Automatic modification of Compose files.
- Kubernetes, databases or Redis backends.
- Multi-language analysis and AI-generated recommendations.
- Scheduled scans.
