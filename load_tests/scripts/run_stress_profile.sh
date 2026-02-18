#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RESULT_DIR="load_tests/results"
mkdir -p "$RESULT_DIR"

export LOCUST_HOST="${LOCUST_HOST:-http://127.0.0.1:8000}"
export LOCUST_ENABLE_WRITE_TASKS="${LOCUST_ENABLE_WRITE_TASKS:-true}"
export LOCUST_WEIGHT_AUTH="${LOCUST_WEIGHT_AUTH:-0}"

SLEEP_BETWEEN_PHASES="${LOCUST_PHASE_SLEEP_SECONDS:-10}"
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

# Perfil alinhado com a esteira CD (modo load-test):
# - spawn_rate=0.4/s para ficar abaixo do throttle de login (30/min por IP)
# - LOCUST_WEIGHT_AUTH=0 para evitar reauth flood
# - fases f1..f5 com a mesma nomenclatura e duracoes da pipeline

# Fase 1: ramp-up ate 100 (100 / 0.4 = 250s de rampa + folga)
run_phase "f1-ramp-100" "100" "0.4" "6m"

# Fase 2: 100 constante (steady state)
run_phase "f2-const-100" "100" "0.4" "5m"

# Fase 3: rampa para alvo 300 (com 10m, concorrencia efetiva atinge ~240)
run_phase "f3-ramp-300" "300" "0.4" "10m"

# Fase 4: 300 constante
run_phase "f4-const-300" "300" "0.4" "5m"

# Fase 5: breakpoint incremental.
for users in 500 700 900; do
  label="f5-break-${users}"
  if ! run_phase "$label" "$users" "0.4" "10m"; then
    echo "[stress] interrompido na carga de ${users} usuarios."
    exit 1
  fi
done

echo "[stress] perfil completo finalizado."
