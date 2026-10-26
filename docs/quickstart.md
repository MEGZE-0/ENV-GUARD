# Quickstart

This guide walks through installing ComposeEnvGuard and running your first scan. You do not need to know Docker Compose internals; the main idea is explained below.

## The three things Compose reads

1. **Interpolation**: `image: myapp:${IMAGE_TAG}`. Compose reads `IMAGE_TAG` while building its configuration. It does **not** enter your container.
2. **Container environment**: `environment: DATABASE_URL: ${DATABASE_URL}`. The variable is read and **passed into the container**.
3. **Environment files**: `env_file: ./config/api.env`. Compose loads every variable in that file **into the container**.

ComposeEnvGuard checks that every variable from these places is documented in your template, that required files exist, and that the template itself is well-formed.

## 1. Install

From a clone of this repository (Python 3.11+):

```bash
python -m pip install .
composeguard version
```

Isolated environment (recommended on shared machines):

```bash
python -m venv .venv
. .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install .
```

Docker instead:

```bash
docker build -t compose-env-guard .
```

## 2. Scan

```bash
cd path/to/your/project       # the directory with compose.yaml
composeguard scan .
```

The scanner looks for `compose.yaml`, `compose.yml`, `docker-compose.yml` and `docker-compose.yaml` in that directory, in that order, and for the template `.env.example` or `.env.sample`.

Use other locations explicitly:

```bash
composeguard scan ./my-project
composeguard scan . --compose compose.yaml --compose compose.prod.yaml
composeguard scan . --env-example .env.sample
```

## 3. Read the result

Each finding has:

- a rule ID (`CEG001`) and severity,
- the variable or file it is about,
- the location (`compose.yaml:13 (service: api)`),
- a **Suggestion**,
- sometimes an **Uncertainty** note that explains what the scanner could not verify.

## 4. Choose what fails your build

- `--fail-on error` (default): only errors fail.
- `--fail-on warning`: warnings also fail.
- `--fail-on never`: report only.

## 5. Save a report

```bash
composeguard scan . --format json --output report.json
composeguard scan . --format markdown --output report.md
```

## Docker: read-only mount

Linux and macOS:

```bash
docker run --rm -v "$PWD:/workspace:ro" compose-env-guard scan /workspace
```

Windows PowerShell:

```powershell
docker run --rm -v "${PWD}:/workspace:ro" compose-env-guard scan /workspace
```

The project is mounted read-only. Write reports to a directory outside the mount, or print them to stdout.

## Try the examples

```bash
composeguard scan examples/healthy-project    # passes
composeguard scan examples/broken-project     # 1 error, 2 warnings, 1 info
```

## Private env files

By default, `.env` and any env file that is not a template is **not read**. Its existence is reported (CEG007), and its variables are treated as unverified. To check the names it defines:

```bash
composeguard scan . --include-env-file .env
```

Only the names are used. Values are discarded immediately and never printed.

## Common problems

| Message | What to do |
| --- | --- |
| `No Compose file found` | Run the command in the directory with your Compose file, or pass `--compose PATH`. |
| `No environment template was found` | Add `.env.example` or `.env.sample`, or pass `--env-example`. Template rules are skipped until then. |
| `The YAML could not be parsed` | Fix the indicated line. Compose will not run with invalid YAML either. |
| `resolves outside the project directory` | Keep env files inside the project, or scan the directory that contains them. |
