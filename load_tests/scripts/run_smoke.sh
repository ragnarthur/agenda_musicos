#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RESULT_DIR="load_tests/results"
mkdir -p "$RESULT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
CSV_PREFIX="$RESULT_DIR/smoke-$STAMP"

export LOCUST_HOST="${LOCUST_HOST:-http://127.0.0.1:8000}"
export LOCUST_ENABLE_WRITE_TASKS="${LOCUST_ENABLE_WRITE_TASKS:-false}"

echo "[smoke] host=$LOCUST_HOST write_tasks=$LOCUST_ENABLE_WRITE_TASKS"

locust -f load_tests/locustfile.py \
  --headless \
  --users "${USERS:-5}" \
  --spawn-rate "${SPAWN_RATE:-1}" \
  --run-time "${RUN_TIME:-45s}" \
  --print-stats \
  --csv "$CSV_PREFIX"

echo "[smoke] relatorios: ${CSV_PREFIX}_stats.csv e ${CSV_PREFIX}_failures.csv"
