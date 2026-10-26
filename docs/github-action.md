# GitHub Actions

ComposeEnvGuard provides a composite action defined in [`action.yml`](../action.yml). It:

1. optionally sets up Python (`actions/setup-python@v7`),
2. creates a private virtual environment and installs ComposeEnvGuard from the action directory,
3. scans the project and writes the Markdown report to `$GITHUB_STEP_SUMMARY`,
4. exits with the scanner's exit code, so the step fails only when your threshold is reached.

It does not comment on pull requests and needs no write permission or secret.

## Copy-paste workflow

Save as `.github/workflows/composeguard.yml` in **your** repository:

```yaml
name: Compose configuration check

on:
  pull_request:

permissions:
  contents: read

jobs:
  composeguard:
    runs-on: ubuntu-latest
    steps:
      - name: Check out the repository
        uses: actions/checkout@v7
        with:
          persist-credentials: false

      - name: Set up Python
        uses: actions/setup-python@v7
        with:
          python-version: "3.12"

      - name: Run ComposeEnvGuard
        # Replace @main with @v1 once the v1 tag has been published (see docs/publishing.md).
        uses: MEGZE-0/ENV-GUARD@main
        with:
          path: .
          fail-on: error
          setup-python: "false"   # Python was set up above
```

Notes:

- `on: pull_request` runs for pull requests from branches in the same repository. Pull requests from forks run with a read-only token, which is sufficient because the workflow only reads files.
- The example pins `actions/checkout` and `actions/setup-python` to their current stable major versions. Pin to a commit SHA if your policy requires it.
- Check the job summary after the run. The report is there even when the step fails.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `path` | `.` | Project directory relative to the repository root. |
| `env-example` | `""` | Template relative to `path`. Empty means `.env.example`, then `.env.sample`. |
| `compose-files` | `""` | Newline-separated Compose files relative to `path`. Empty means the default name. |
| `fail-on` | `error` | `error`, `warning`, `info` or `never`. Any other value fails the step before scanning. |
| `python-version` | `3.12` | Used when `setup-python` is `true`. Must be 3.11 or newer. |
| `setup-python` | `true` | Set to `false` if an earlier step already provides Python 3.11+ on `PATH`. |

Example with several Compose files:

```yaml
      - uses: MEGZE-0/ENV-GUARD@main
        with:
          path: services/api
          env-example: .env.sample
          compose-files: |
            compose.yaml
            compose.prod.yaml
          fail-on: warning
          setup-python: "false"
```

## Security

- Inputs are passed to the script through `env:`. They are never interpolated into shell code, and the script passes them to the scanner as separate arguments. A value such as `$(curl …)` is treated as a literal file name and rejected.
- The script validates `fail-on` before doing anything else.
- The scanner runs only from the action's own directory, after an install into a private virtual environment that is deleted at the end.
- No secrets are required. Do not add `secrets:` to the workflow.

## Runner requirements

- `bash` on the runner. GitHub-hosted `ubuntu-latest`, `macos-latest` and `windows-latest` provide it.
- Python 3.11 or newer, provided by `actions/setup-python` or already on `PATH`.
- Network access to PyPI when the action installs its dependencies (typer, rich, pydantic, PyYAML, python-dotenv).
- Verified in this repository: the workflow in `.github/workflows/ci.yml` runs the action against the healthy example on `ubuntu-latest`. Windows and macOS runners have not been verified.

## Using the action before a tag exists

The action is usable from any commit of this repository: `MEGZE-0/ENV-GUARD@<commit-sha>` or `@main`. The `v1` tag becomes available only after it is published; see [publishing.md](publishing.md). Until then, do not reference `@v1`.

## Local dry run of the script

The script can be exercised without GitHub:

```bash
CEG_ACTION_PATH="$PWD" CEG_PYTHON=python3 CEG_PATH=examples/healthy-project \
  CEG_FAIL_ON=error bash scripts/ci-scan.sh
```

Set `CEG_COMPOSEGUARD_BIN` to an installed `composeguard` executable to skip creating a virtual environment.
