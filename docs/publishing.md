# Publishing checklist

This document tracks what is needed before ComposeEnvGuard is published. **Nothing in this list has been done yet** unless it is ticked, and a tick means the step was actually performed and verified.

## Repository

- [ ] Repository description: *Read-only, local checker for Docker Compose environment configuration: undocumented variables, missing env files, and template problems, without printing secret values.*
- [ ] Topics: `docker`, `docker-compose`, `compose`, `environment-variables`, `dotenv`, `env`, `configuration`, `linter`, `static-analysis`, `devops`, `github-action`, `python`, `fastapi`, `typer`, `security`
- [ ] Branch protection on `main`: require the CI workflow to pass before merging.
- [ ] Private vulnerability reporting enabled (referenced by SECURITY.md). **Not checked; a maintainer must enable it.**
- [ ] Issue templates reviewed (`.github/ISSUE_TEMPLATE/`), and the beginner issues in `docs/issue-drafts/` opened if wanted.

## Verification before tagging

- [x] CI workflow run green on GitHub for Python 3.11, 3.12 and 3.13 (run 40311468211, commit 020479c).
- [x] Docker image built and smoke-tested on a GitHub-hosted Docker daemon, including `docker compose up` and the API endpoints (same run, job "Docker image, CLI and Compose API smoke test"). Not run on a maintainer's own machine.
- [x] Composite action run on GitHub against `examples/healthy-project` (same run, job "Composite action smoke test").
- [ ] Maintainer re-runs the Docker smoke test on Docker Desktop or another local daemon (optional).
- [ ] `python -m build` produces `compose_env_guard-<version>` sdist and wheel; the wheel installs into a clean venv and `composeguard version` works (**verified locally on 0.1.0**).
- [ ] `ruff check .` and `ruff format --check .` pass; `pytest` passes with coverage ≥ 85% (**verified locally**).

## Version and release (0.1.0)

1. Version is already `0.1.0` in `src/compose_env_guard/__init__.py`. Move the `Unreleased` entries in `CHANGELOG.md` under `0.1.0`, and use `docs/release/v0.1.0.md` as the release description after review.
2. Run the verification steps above.
3. Tag the commit: `git tag -a v0.1.0 -m "ComposeEnvGuard 0.1.0"` and push the tag.
4. Create a GitHub release from the tag with the CHANGELOG section as notes. Attach `dist/*` if desired.

## Publishing the GitHub Action (`v1`)

The action is referenced as `MEGZE-0/ENV-GUARD@v1` only after this procedure:

1. Make sure `action.yml` and `scripts/ci-scan.sh` are in the release commit.
2. Run the composite-action smoke test in CI on that commit.
3. Create the tag `v1.0.0` for the release, and move a `v1` tag to the same commit: `git tag -f v1 v1.0.0`, then `git push --force origin v1`. Moving a major tag is a deliberate, documented action; do it only for a fix that stays compatible.
4. Publish the release on GitHub, and only then update the documentation examples from `@main` to `@v1`.

Do not reference `@v1` in documentation before step 3 has been performed.

## PyPI (not yet published)

ComposeEnvGuard is **not on PyPI**. Do not claim otherwise. To publish, a maintainer must:

1. Create the project name on PyPI (`compose-env-guard`), if it is available.
2. Configure trusted publishing (OIDC) from GitHub Actions rather than storing an API token.
3. Upload the built artifacts from a tagged release, and then verify with `python -m pip install compose-env-guard` in a clean environment.

## Launch announcement (draft, for when the project is published)

> **ComposeEnvGuard 0.1.0**: a read-only, local checker for Docker Compose environment configuration.
>
> It reads your `compose.yaml` and `.env.example`, then tells you which variables Compose uses but your template does not document, which required `env_file` is missing, and where your template has duplicates. It never prints environment values, never reads `.env` files by default, and never sends your data anywhere.
>
> Try it on the bundled examples: `composeguard scan examples/broken-project`.
> Feedback on false positives is the most useful thing right now.

Do not add stars, testimonials or download numbers to any announcement before they exist.

## Demo recording

Not produced in this release. If one is made, record the real terminal output of `composeguard scan examples/broken-project` and nothing else.
