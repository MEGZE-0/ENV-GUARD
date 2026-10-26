# Publishing checklist

This document tracks what is needed before ComposeEnvGuard is published. **Nothing in this list has been done yet** unless it is ticked, and a tick means the step was actually performed and verified.

## Repository

- [ ] Repository description: *Read-only, local checker for Docker Compose environment configuration: undocumented variables, missing env files, and template problems, without printing secret values.*
- [ ] Topics: `docker`, `docker-compose`, `compose`, `environment-variables`, `dotenv`, `env`, `configuration`, `linter`, `static-analysis`, `devops`, `github-action`, `python`, `fastapi`, `typer`, `security`
- [ ] Branch protection on `main`: require the CI workflow to pass before merging.
- [ ] Private vulnerability reporting enabled (referenced by SECURITY.md). **Not checked; a maintainer must enable it.**
- [ ] Issue templates reviewed (`.github/ISSUE_TEMPLATE/`), and the beginner issues in `docs/issue-drafts/` opened if wanted.

## Verification before tagging

- [ ] CI workflow green on GitHub for Python 3.11, 3.12 and 3.13 on the release commit (check the pull request checks).
- [ ] Docker image smoke test green on GitHub (job "Docker image, CLI and Compose API smoke test") on the release commit. Passed on earlier commits of this branch; check it again on the release commit. Not run on a maintainer's own machine.
- [ ] Composite action smoke test green on GitHub on the release commit.
- [ ] Maintainer re-runs the Docker smoke test on Docker Desktop or another local daemon (optional).
- [ ] `python -m build` produces `compose_env_guard-<version>` sdist and wheel; the wheel installs into a clean venv and `composeguard version` works (**verified locally on 0.1.0**).
- [ ] `ruff check .` and `ruff format --check .` pass; `pytest` passes with coverage ≥ 85% (**verified locally**).

## Version and release (0.1.0)

1. Version is already `0.1.0` in `src/compose_env_guard/__init__.py`. Move the `Unreleased` entries in `CHANGELOG.md` under `0.1.0`, and use `docs/release/v0.1.0.md` as the release description after review.
2. Run the verification steps above.
3. Tag the commit: `git tag -a v0.1.0 -m "ComposeEnvGuard 0.1.0"` and push the tag.
4. Create a GitHub release from the tag with the CHANGELOG section as notes. Attach `dist/*` if desired.

## Publishing the GitHub Action (`v0.1.0`)

The action is the repository's root `action.yml`. It is published by the same `v0.1.0` tag as the package, so users reference `MEGZE-0/ENV-GUARD@v0.1.0`.

1. Confirm the release commit contains `action.yml` and `scripts/ci-scan.sh`, and that the `Composite action smoke test` job is green on that commit.
2. Create the annotated tag on that commit: `git tag -a v0.1.0 -m "ComposeEnvGuard 0.1.0"` and push it: `git push origin v0.1.0`.
3. Publish the GitHub release from that tag.
4. Only after step 3, the examples in `README.md` and `docs/github-action.md` resolve as written.

Do not move `v0.1.0` after publication. If a fix is needed, release `0.1.1` and reference that tag. A floating `v1` or `v0` tag is intentionally not part of this release.

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
