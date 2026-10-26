#!/usr/bin/env bash
# Runs ComposeEnvGuard for the composite GitHub Action (action.yml).
#
# All user-controlled inputs arrive as environment variables and are passed to the
# scanner as separate argv entries. Nothing is ever evaluated by the shell, so workflow
# inputs cannot inject commands.
#
# Inputs (environment variables):
#   CEG_ACTION_PATH     directory containing this action (pyproject.toml lives here)
#   CEG_PYTHON          Python interpreter used to create the private virtualenv
#   CEG_COMPOSEGUARD_BIN optional path to an already-installed composeguard executable.
#                       When set, no virtualenv is created or installed (useful for
#                       pre-provisioned or offline runners).
#   CEG_PATH            project directory to scan
#   CEG_ENV_EXAMPLE     optional environment template path (relative to CEG_PATH)
#   CEG_COMPOSE_FILES   optional newline-separated Compose file paths (relative to CEG_PATH)
#   CEG_FAIL_ON         error | warning | info | never
#   GITHUB_STEP_SUMMARY file that receives the Markdown report (optional, set by GitHub)
set -uo pipefail

fail() {
  echo "::error::ComposeEnvGuard: $*" >&2
  exit 2
}

ACTION_PATH="${CEG_ACTION_PATH:-}"
[ -n "$ACTION_PATH" ] || fail "CEG_ACTION_PATH is not set."
[ -f "$ACTION_PATH/pyproject.toml" ] || fail "pyproject.toml not found in the action directory."

PYTHON_BIN="${CEG_PYTHON:-python3}"

PROJECT_PATH="${CEG_PATH:-.}"
case "$PROJECT_PATH" in
  -*) fail "path must not start with '-'." ;;
esac
[ -d "$PROJECT_PATH" ] || fail "project path '$PROJECT_PATH' is not a directory."

FAIL_ON="${CEG_FAIL_ON:-error}"
case "$FAIL_ON" in
  error|warning|info|never) ;;
  *) fail "fail-on must be one of: error, warning, info, never." ;;
esac

WORK_DIR="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/composeguard.XXXXXX")" || fail "could not create a temporary directory."
trap 'rm -rf "$WORK_DIR"' EXIT

REPORT="$WORK_DIR/report.md"

if [ -n "${CEG_COMPOSEGUARD_BIN:-}" ]; then
  SCANNER="$CEG_COMPOSEGUARD_BIN"
else
  command -v "$PYTHON_BIN" >/dev/null 2>&1 || fail "Python interpreter '$PYTHON_BIN' was not found. Run actions/setup-python first."
  VENV_DIR="$WORK_DIR/venv"
  "$PYTHON_BIN" -m venv "$VENV_DIR" || fail "could not create a virtual environment."
  "$VENV_DIR/bin/python" -m pip install --quiet --disable-pip-version-check "$ACTION_PATH" \
    || fail "installing compose-env-guard from the action directory failed."
  SCANNER="$VENV_DIR/bin/composeguard"
fi

ARGS=(scan "$PROJECT_PATH" --format markdown --output "$REPORT" --fail-on "$FAIL_ON")

if [ -n "${CEG_ENV_EXAMPLE:-}" ]; then
  case "$CEG_ENV_EXAMPLE" in
    -*) fail "env-example must not start with '-'." ;;
  esac
  ARGS+=(--env-example "$CEG_ENV_EXAMPLE")
fi

if [ -n "${CEG_COMPOSE_FILES:-}" ]; then
  while IFS= read -r compose_file; do
    # Trim surrounding whitespace and skip blank lines.
    compose_file="${compose_file#"${compose_file%%[![:space:]]*}"}"
    compose_file="${compose_file%"${compose_file##*[![:space:]]}"}"
    [ -n "$compose_file" ] || continue
    case "$compose_file" in
      -*) fail "compose-files entries must not start with '-'." ;;
    esac
    ARGS+=(--compose "$compose_file")
  done <<< "$CEG_COMPOSE_FILES"
fi

"$SCANNER" "${ARGS[@]}"
STATUS=$?

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  if [ -s "$REPORT" ]; then
    cat "$REPORT" >> "$GITHUB_STEP_SUMMARY"
  else
    printf '## ComposeEnvGuard\n\nNo report was produced (exit code %s). See the job log.\n' "$STATUS" >> "$GITHUB_STEP_SUMMARY"
  fi
fi

exit "$STATUS"
