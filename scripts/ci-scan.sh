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
if command -v cygpath >/dev/null 2>&1; then
  ACTION_PATH="$(cygpath -m "$ACTION_PATH")"
fi
[ -f "$ACTION_PATH/pyproject.toml" ] || fail "pyproject.toml not found in the action directory."

if [ -n "${CEG_PYTHON:-}" ]; then
  PYTHON_BIN="$CEG_PYTHON"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
else
  PYTHON_BIN="python"
fi

PROJECT_PATH="${CEG_PATH:-.}"
case "$PROJECT_PATH" in
  -*) fail "path must not start with '-'." ;;
esac
if command -v cygpath >/dev/null 2>&1; then
  PROJECT_PATH="$(cygpath -m "$PROJECT_PATH")"
fi
[ -d "$PROJECT_PATH" ] || fail "project path '$PROJECT_PATH' is not a directory."

FAIL_ON="${CEG_FAIL_ON:-error}"
case "$FAIL_ON" in
  error|warning|info|never) ;;
  *) fail "fail-on must be one of: error, warning, info, never." ;;
esac

TEMP_BASE="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
if command -v cygpath >/dev/null 2>&1; then
  TEMP_BASE="$(cygpath -u "$TEMP_BASE")"
fi
WORK_DIR="$(mktemp -d "$TEMP_BASE/composeguard.XXXXXX")" || fail "could not create a temporary directory."
trap 'rm -rf "$WORK_DIR"' EXIT

REPORT="$WORK_DIR/report.md"
REPORT_FOR_SCANNER="$REPORT"
if command -v cygpath >/dev/null 2>&1; then
  REPORT_FOR_SCANNER="$(cygpath -m "$REPORT")"
fi

if [ -n "${CEG_COMPOSEGUARD_BIN:-}" ]; then
  SCANNER="$CEG_COMPOSEGUARD_BIN"
  if command -v cygpath >/dev/null 2>&1; then
    SCANNER="$(cygpath -m "$SCANNER")"
  fi
else
  command -v "$PYTHON_BIN" >/dev/null 2>&1 || fail "Python interpreter '$PYTHON_BIN' was not found. Run actions/setup-python first."
  VENV_DIR="$WORK_DIR/venv"
  "$PYTHON_BIN" -m venv "$VENV_DIR" || fail "could not create a virtual environment."
  if [ -d "$VENV_DIR/Scripts" ]; then
    VENV_BIN="$VENV_DIR/Scripts"
  else
    VENV_BIN="$VENV_DIR/bin"
  fi
  PYTHON_VENV="$VENV_BIN/python"
  [ -f "$PYTHON_VENV.exe" ] && PYTHON_VENV="$PYTHON_VENV.exe"
  "$PYTHON_VENV" -m pip install --quiet --disable-pip-version-check "$ACTION_PATH" \
    || fail "installing compose-env-guard from the action directory failed."
  SCANNER="$VENV_BIN/composeguard"
  [ -f "$SCANNER.exe" ] && SCANNER="$SCANNER.exe"
fi

ARGS=(scan "$PROJECT_PATH" --format markdown --output "$REPORT_FOR_SCANNER" --fail-on "$FAIL_ON")

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
  SUMMARY_DEST="$GITHUB_STEP_SUMMARY"
  if command -v cygpath >/dev/null 2>&1; then
    SUMMARY_DEST="$(cygpath -u "$GITHUB_STEP_SUMMARY")"
  fi
  if [ -s "$REPORT" ]; then
    cat "$REPORT" >> "$SUMMARY_DEST"
  else
    printf '## ComposeEnvGuard\n\nNo report was produced (exit code %s). See the job log.\n' "$STATUS" >> "$SUMMARY_DEST"
  fi
fi

exit "$STATUS"
