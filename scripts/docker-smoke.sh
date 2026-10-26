#!/usr/bin/env bash
# End-to-end Docker smoke test for ComposeEnvGuard.
#
# Requires a reachable Docker daemon, the Docker Compose v2 plugin, and curl.
# Run from the repository root:  bash scripts/docker-smoke.sh [cli|api|all]
#   cli  build the image, check the non-root user, and check the CLI exit codes
#   api  start the Compose stack and check the HTTP API and port binding
#   all  both (default)
# Exits non-zero on the first failed check. Always tears the Compose stack down.
set -uo pipefail

PHASE="${1:-all}"
case "$PHASE" in
  cli|api|all) ;;
  *) echo "usage: $0 [cli|api|all]" >&2; exit 2 ;;
esac

IMAGE="${CEG_SMOKE_IMAGE:-compose-env-guard:smoke}"
API_URL="http://127.0.0.1:8000"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 2

# Progress and failure details are also emitted as GitHub annotations, which are visible
# through the check-run API even when the job log cannot be downloaded.
annotate() {
  # Read stdin and emit one annotation with newlines escaped for the workflow command format.
  local msg
  msg="$(cat)"
  msg="${msg//'%'/%25}"
  msg="${msg//$'\r'/}"
  msg="${msg//$'\n'/%0A}"
  echo "::error::$msg"
}

pass() { echo "PASS: $*"; echo "::notice::PASS: $*"; }

fail() {
  echo "FAIL: $*" >&2
  echo "::error::FAIL: $*"
  exit 1
}

teardown() {
  docker compose down --remove-orphans >/dev/null 2>&1 || true
}
trap teardown EXIT

command -v docker >/dev/null 2>&1 || fail "docker is not installed"
docker info >/dev/null 2>&1 || fail "the Docker daemon is not reachable"
command -v curl >/dev/null 2>&1 || fail "curl is not installed"

# 1. Image build -------------------------------------------------------------
docker build -q -t "$IMAGE" . >/dev/null || fail "docker build failed"
pass "image builds"

# 2. Runs as a non-root user ------------------------------------------------
uid="$(docker run --rm --entrypoint id "$IMAGE" -u)"
[ "$uid" = "10001" ] || fail "container runs as uid '$uid', expected 10001"
pass "container runs as non-root uid 10001"

# 3. CLI scans from a read-only mount ---------------------------------------
if [ "$PHASE" != "api" ]; then
docker run --rm --network none -v "$ROOT/examples/healthy-project:/workspace:ro" "$IMAGE" \
  scan /workspace >/tmp/ceg-healthy.txt 2>&1
code=$?
if [ "$code" -ne 0 ]; then
  tail -n 60 /tmp/ceg-healthy.txt | annotate
  fail "healthy example exited $code, expected 0"
fi
grep -q "Final status: Passed" /tmp/ceg-healthy.txt || fail "healthy example did not report Passed"
pass "healthy example scans to Passed (exit 0)"

docker run --rm --network none -v "$ROOT/examples/broken-project:/workspace:ro" "$IMAGE" \
  scan /workspace >/tmp/ceg-broken.txt 2>&1
code=$?
if [ "$code" -ne 1 ]; then
  tail -n 60 /tmp/ceg-broken.txt | annotate
  fail "broken example exited $code, expected 1"
fi
for rule in CEG001 CEG002 CEG003 CEG004; do
  grep -q "$rule" /tmp/ceg-broken.txt || fail "broken example did not report $rule"
done
pass "broken example reports CEG001-CEG004 and exits 1"
fi
[ "$PHASE" = "cli" ] && { echo "CLI phase passed."; exit 0; }

# 4. Compose stack -------------------------------------------------------------
docker compose config -q >/tmp/ceg-compose-config.txt 2>&1 || { annotate </tmp/ceg-compose-config.txt; fail "docker compose config is invalid"; }
if ! docker compose up --build -d >/tmp/ceg-compose-up.txt 2>&1; then
  tail -n 80 /tmp/ceg-compose-up.txt | annotate
  fail "docker compose up failed"
fi
pass "docker compose up succeeded"

# Wait for /health (up to 60 seconds).
healthy=""
for _ in $(seq 1 30); do
  if curl -fsS "$API_URL/health" >/dev/null 2>&1; then healthy=1; break; fi
  sleep 2
done
if [ -z "$healthy" ]; then
  docker compose ps -a 2>&1 | tail -n 20 | annotate
  docker compose logs --no-color api 2>&1 | tail -n 60 | annotate
  fail "API did not answer /health within 60 seconds"
fi

health_body="$(curl -fsS "$API_URL/health")"
case "$health_body" in *'"status":"ok"'*) ;; *) fail "unexpected /health body" ;; esac
pass "GET /health returns status ok"

docs_code="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/docs")"
[ "$docs_code" = "200" ] || fail "GET /docs returned $docs_code"
pass "GET /docs returns 200"

scan_body='{"files": {"compose.yaml": "services:\n  api:\n    image: example/api:${IMAGE_TAG}\n", ".env.example": "IMAGE_TAG=latest\n"}}'
scan_code="$(curl -s -o /tmp/ceg-api-scan.json -w '%{http_code}' -X POST "$API_URL/api/v1/scan" \
  -H 'Content-Type: application/json' -d "$scan_body")"
if [ "$scan_code" != "200" ]; then
  head -c 2000 /tmp/ceg-api-scan.json | annotate
  fail "POST /api/v1/scan returned $scan_code"
fi
grep -q '"status":"passed"' /tmp/ceg-api-scan.json || fail "API scan did not report passed"
pass "POST /api/v1/scan returns 200 with a passed report"

bad_code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/api/v1/scan" \
  -H 'Content-Type: application/json' -d '{"files": {"../escape.yaml": "services: {}"}}')"
[ "$bad_code" = "422" ] || fail "traversal name returned $bad_code, expected 422"
pass "traversal file name is rejected with 422"

# 5. Binding: published on 127.0.0.1 only -------------------------------------
published="$(docker compose port api 8000)"
case "$published" in
  127.0.0.1:*) pass "port is published on 127.0.0.1 only ($published)" ;;
  *) fail "port is published on an unexpected address: $published" ;;
esac

echo "All Docker smoke checks passed."
echo "::notice::All Docker smoke checks passed."
