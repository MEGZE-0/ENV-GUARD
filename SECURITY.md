# Security policy

## Supported versions

Only the latest release receives security fixes. The project is pre-1.0; until a release is tagged, only the `main` branch is supported.

## Reporting a vulnerability

Please **do not** open a public issue for a security problem.

Use GitHub's private vulnerability reporting for this repository (Security tab → "Report a vulnerability"). If that option is unavailable, contact the maintainers privately through the contact details on the repository profile. Include:

- the ComposeEnvGuard version (`composeguard version`),
- a minimal reproduction using invented values (never real secrets),
- what you expected and what happened.

We aim to acknowledge reports within a few working days. Response times are best-effort: the project has no paid support team. There is no bug bounty.

## Threat model

ComposeEnvGuard is a **local, read-only analysis tool**. It is designed for the following assets and actors.

### Assets

1. **Environment values** (passwords, tokens, keys) that may appear in `.env` files, Compose files or uploaded templates.
2. **The integrity of the project directory**: the scanner must not modify it.
3. **The host** on which the scanner, the CLI or the API runs.
4. **CI logs and job summaries** where reports are written.

### Actors and assumptions

- The **project author** is trusted but may make mistakes.
- A **contributor or pull-request author** may supply hostile Compose or template files (for example, names like `$(curl …)`, symlinks, huge files, malformed YAML, path traversal, billion-laughs YAML).
- A **network client** of the optional HTTP API may send arbitrary JSON.
- **Local users** on a shared machine can read reports written to shared locations.

### Controls

| Threat | Control |
| --- | --- |
| Secret values leak into reports, logs or errors | Values are never retained. Reports, messages and errors use names, line numbers and fixed text. YAML parser exceptions are not printed (they include source text); only the problem description and line number are used. |
| Secret-bearing files are read without the user asking | `.env`, `.env.local`, `.env.production` and any env file that is not a template or an explicit `--include-env-file` are never opened. Their existence is reported as CEG007. |
| Path traversal or reads outside the project | Every path is resolved relative to the project root and rejected if it escapes. Absolute paths and paths with NUL bytes are rejected. |
| Symlinks pointing outside the project | Symlinks are not followed when they resolve outside the project boundary. |
| Denial of service through large files or deep YAML | Size limits (1 MiB Compose, 256 KiB env files, 64 KiB configuration, 10 Compose files, 50 env file reads). The API enforces a 1 MiB request limit while streaming, 20 files, and 256 KiB per file. Aliases in YAML are checked for recursion. |
| Code execution through YAML or the scanner | `yaml.SafeLoader` is used on node trees; custom tags are not constructed. The scanner never evaluates values, never calls a shell and never imports user code. |
| Shell injection in CI | GitHub Action inputs are passed as environment variables, not interpolated into scripts; arguments are passed to the scanner as separate argv entries. |
| Docker socket exposure | Neither the Dockerfile nor compose.yaml mounts the Docker socket. The container runs as a non-root user, with a read-only root filesystem, all capabilities dropped, and `no-new-privileges`. |
| Unauthorized API use | The default bind is `127.0.0.1`. The Docker Compose port mapping is `127.0.0.1:8000:8000`. **There is no authentication.** |
| Information disclosure through API errors | Validation errors are sanitised: input is removed, and unexpected errors return a generic 500 without a traceback. |
| Telemetry or data exfiltration | None. The tool makes no network calls during a scan. |
| Modification of the project | The scan opens files read-only. Output is written only where `--output` points. |

### Known residual risks

- **Interpolation references are sensitive metadata.** Variable names such as `ADMIN_PASSWORD` appear in reports. This is by design (names are needed), but a shared report can reveal your architecture.
- **Templates may contain real values.** If your `.env.example` contains a real secret, that secret is not printed by ComposeEnvGuard, but it is still a leak in your repository. The scanner does not detect secret values.
- **`--include-env-file`** reads an arbitrary file you name. Only names are kept, but the file is read and parsed. Use it only on files you trust.
- **The API has no authentication, rate limiting or TLS.** Do not expose it beyond localhost without a reverse proxy providing those controls.
- **Denial of service remains possible** within the limits, for example through many scans in a row.
- **Malicious local code** running as the same user can read anything the user can read; ComposeEnvGuard is not a sandbox.
- **Dependencies** (FastAPI, Pydantic, PyYAML, python-dotenv, Typer, Rich, uvicorn) may have vulnerabilities. Keep them updated; the project does not pin transitive versions in the library, so use a lock file in your environment if you need reproducibility.

## Review performed for v0.1.0

This is a self-review by the implementers, not an independent audit. The checks below were run; anything not listed was not tested.

| Check | How | Result |
| --- | --- | --- |
| Static: process execution, `eval`/`exec`, unsafe YAML loaders | `grep` over `src/` and `scripts/` | None found. Only `yaml.compose_all(..., Loader=SafeLoader)` and `yaml.safe_load` are used |
| Secret values in outputs | Planted canary values in `.env`, env files, template, malformed YAML, flow YAML, API bodies; checked in terminal, JSON, Markdown, errors and API responses | No canary value appeared. Covered by `tests/test_secret_leakage.py` |
| Path traversal and symlinks | Traversal, absolute and symlinked paths in `env_file`, `--compose`, `--env-example`, `--include-env-file`, and symlinked Compose or template files | Refused. A refused template or Compose file is now a visible error (fixed; see below) |
| Hostile YAML tags | `!!python/object/apply:os.system` on an `image:` value, and `!reset` | Never constructed or executed (SafeLoader only builds nodes). Each is reported as a CEG005 warning with its line. Before the fix this was missed (see below) |
| API paths and validation errors | Traversal, absolute, `.env`, bad extension, NUL byte, bad types, bad JSON, oversized body | 422/413 with sanitised messages; no temp-directory or host paths. A user's own outside-path string is no longer echoed in `files` |
| Docker runtime user and capabilities | CI: `id -u` inside the image | uid 10001 (non-root). `cap_drop: ALL`, `no-new-privileges`, read-only root filesystem with a `/tmp` tmpfs in `compose.yaml` (verified by CI for the stack starting; capabilities are configured, not separately tested) |
| API bind address | `composeguard serve` default and the Compose port mapping | `127.0.0.1` by default. In the sandbox the server listened only on `127.0.0.1` |
| Hardcoded credentials | Pattern search for password/secret/token/key assignments outside tests | None. Test values are invented constants |

### Bugs found by this review and fixed

- A symlinked `.env.example` (or `.env.sample`) that pointed outside the project was silently treated as "no template", and the scan passed. It is now a CEG005 error.
- A symlinked `compose.yaml` that pointed outside the project produced a generic "No Compose file found". It now names the file and explains the refusal (exit 2).
- The raw path of an `env_file` outside the project was echoed into the report's `files` list. It is now labelled by the file that declared it.
- An unused name lookup (`is_within`) was missing from `scanner.py`; the new code path raised `NameError`, which the generic handler turned into exit 2. The tests caught it before release.
- Unsupported YAML tags such as `!!python/...` were not reported, because the check missed the expanded tag form and fields such as `image` were not visited. They are now reported once each (CEG005 warning). Execution was never possible through this path.

### Residual risks

- The Docker base image is referenced by tag (`python:3.12-slim`), not by digest. Pin a digest before a production deployment.
- The API still has no authentication, rate limiting, or TLS. Do not expose it beyond localhost without a proxy that adds them.
- Variable names, including sensitive-sounding names such as `ADMIN_PASSWORD`, appear in reports by design.

## Safe usage checklist

- Keep the API bound to localhost, or put it behind an authenticated, TLS-terminating proxy.
- Do not pass real `.env` files to the API. It accepts only templates and Compose files.
- Do not paste real secrets into issues or bug reports. Use invented values.
- Review reports before attaching them to public issues.
