#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RESULT_DIR="load_tests/results"
mkdir -p "$RESULT_DIR"

export LOCUST_HOST="${LOCUST_HOST:-http://127.0.0.1:8000}"
export LOCUST_ENABLE_WRITE_TASKS="${LOCUST_ENABLE_WRITE_TASKS:-true}"

SLEEP_BETWEEN_PHASES="${LOCUST_PHASE_SLEEP_SECONDS:-20}"
STAMP="$(date +%Y%m%d-%H%M%S)"

run_phase() {
  local label="$1"
  local users="$2"
  local spawn_rate="$3"
  local runtime="$4"
  local csv_prefix="$RESULT_DIR/${STAMP}-${label}"

  echo ""
  echo "[stress] fase=$label users=$users spawn_rate=$spawn_rate runtime=$runtime"
  locust -f load_tests/locustfile.py \
    --headless \
    --users "$users" \
    --spawn-rate "$spawn_rate" \
    --run-time "$runtime" \
    --print-stats \
    --csv "$csv_prefix"

  echo "[stress] aguardando ${SLEEP_BETWEEN_PHASES}s antes da proxima fase..."
  sleep "$SLEEP_BETWEEN_PHASES"
}

# Fase 1: 10 -> 100 (ramp-up gradual)
run_phase "phase1-ramp-10-100" "100" "0.3" "5m"

# Fase 2: 100 constante
run_phase "phase2-const-100" "100" "2" "10m"

# Fase 3: 100 -> 500 (ramp-up agressivo)
run_phase "phase3-ramp-100-500" "500" "1.3" "5m"

# Fase 4: 500 constante
run_phase "phase4-const-500" "500" "5" "10m"

# Fase 5: stress incremental ate falhar pelos gates de qualidade.
for users in 600 700 800 900 1000; do
  label="phase5-break-${users}"
  if ! run_phase "$label" "$users" "8" "4m"; then
    echo "[stress] interrompido na carga de ${users} usuarios."
    exit 1
  fi
done

echo "[stress] perfil completo finalizado."
