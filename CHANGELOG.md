# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/) once it reaches 1.0.

## [Unreleased]

## [0.1.0] - 2026-10-26

Initial development version. Not yet published to PyPI or tagged.

### Added

- Command-line interface `composeguard` with `scan`, `rules`, `serve` and `version`.
- Compose analysis for `compose.yaml`, `compose.yml`, `docker-compose.yml` and `docker-compose.yaml`, with repeatable `--compose` for overrides.
- Environment template parsing for `.env.example` and `.env.sample`.
- Interpolation parser for `$VAR`, `${VAR}`, `:-`, `-`, `:?`, `?`, `:+`, `+`, `$$` and nested defaults. No regular expressions, no evaluation.
- Rules CEG001–CEG008 with severities, suggestions and uncertainty notes.
- Terminal, JSON and Markdown reports. JSON has `schema_version` and a JSON Schema in `docs/report.schema.json`.
- Privacy policy: private env files are not read by default; `--include-env-file` reads names only.
- Configuration file `.composeguard.yaml` with disabled rules, severity overrides, external variables and service contracts.
- Optional FastAPI application: `GET /health`, `GET /api/v1/rules`, `POST /api/v1/scan`, `GET /docs`.
- Dockerfile (non-root, read-only project mount in examples) and `compose.yaml` publishing the API on `127.0.0.1`.
- Composite GitHub Action (`action.yml`) and `scripts/ci-scan.sh` writing the Markdown report to the job summary.
- Continuous integration workflow (`.github/workflows/ci.yml`) defined for Python 3.11–3.13, linting, package build, clean-install check, Docker build and composite-action smoke test. It has not yet run on GitHub.
- Documentation: README, quickstart, rules, architecture, limitations, API, JSON report, GitHub Action, security policy, contributing guide, publishing checklist.
- Examples: `examples/healthy-project` and `examples/broken-project`.

### Fixed during pre-release verification

- A symlinked template or Compose file that resolves outside the project is an error (CEG005 for the template, exit 2 for Compose), not a silent pass.
- Unsupported YAML tags such as `!!python/...` on any field are reported (CEG005 warning). They were previously missed. They are never constructed or executed.
- Outside-project `env_file` paths are no longer echoed in reports.
- Absolute command-line paths that point inside the project are accepted.
- The Compose API command passes `serve` to the image entrypoint; previously the container restarted in a loop.
- The composite action and scripts refuse option-like inputs (values beginning with `-`).
