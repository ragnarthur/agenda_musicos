#!/usr/bin/env bash
set -euo pipefail

APP_BASE_URL="${APP_BASE_URL:-https://gigflowagenda.com.br}"
APP_BASE_URL="${APP_BASE_URL%/}"

API_BASE_URL="${API_BASE_URL:-${APP_BASE_URL}/api}"
API_BASE_URL="${API_BASE_URL%/}"

ROUTES_TO_CHECK="${ROUTES_TO_CHECK:-/ /app-start /login /musicos /eventos}"
RESOLVE_IP="${RESOLVE_IP:-}"

CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-5}"
CURL_MAX_TIME="${CURL_MAX_TIME:-15}"

TMP_FILES=()

cleanup() {
  for file in "${TMP_FILES[@]:-}"; do
    rm -f "$file" 2>/dev/null || true
  done
}
trap cleanup EXIT

fail() {
  echo "[FAIL] $1" >&2
  exit 1
}

ok() {
  echo "[OK] $1"
}

parse_host_port() {
  local url="$1"
  if [[ "$url" =~ ^https?://([^/:]+)(:([0-9]+))? ]]; then
    local host="${BASH_REMATCH[1]}"
    local port="${BASH_REMATCH[3]:-}"
    if [[ -z "$port" ]]; then
      if [[ "$url" =~ ^https:// ]]; then
        port="443"
      else
        port="80"
      fi
    fi
    echo "${host}:${port}"
    return 0
  fi
  return 1
}

APP_HOST_PORT="$(parse_host_port "$APP_BASE_URL")" || fail "APP_BASE_URL invalida: $APP_BASE_URL"
API_HOST_PORT="$(parse_host_port "$API_BASE_URL")" || fail "API_BASE_URL invalida: $API_BASE_URL"

CURL_COMMON_ARGS=(
  -sS
  --connect-timeout "$CURL_CONNECT_TIMEOUT"
  --max-time "$CURL_MAX_TIME"
)

CURL_RESOLVE_ARGS=()
if [[ -n "$RESOLVE_IP" ]]; then
  CURL_RESOLVE_ARGS+=(--resolve "${APP_HOST_PORT}:${RESOLVE_IP}")
  if [[ "$API_HOST_PORT" != "$APP_HOST_PORT" ]]; then
    CURL_RESOLVE_ARGS+=(--resolve "${API_HOST_PORT}:${RESOLVE_IP}")
  fi
fi

LAST_STATUS=""
LAST_HEADERS_FILE=""
LAST_BODY_FILE=""

perform_request() {
  local method="$1"
  local url="$2"
  local payload="${3:-}"

  LAST_HEADERS_FILE="$(mktemp)"
  LAST_BODY_FILE="$(mktemp)"
  TMP_FILES+=("$LAST_HEADERS_FILE" "$LAST_BODY_FILE")

  local curl_args=(
    "${CURL_COMMON_ARGS[@]}"
    "${CURL_RESOLVE_ARGS[@]}"
    -X "$method"
    -D "$LAST_HEADERS_FILE"
    -o "$LAST_BODY_FILE"
    -w "%{http_code}"
  )

  if [[ -n "$payload" ]]; then
    curl_args+=(-H "Content-Type: application/json" --data "$payload")
  fi

  curl_args+=("$url")
  LAST_STATUS="$(curl "${curl_args[@]}")"
}

assert_status() {
  local expected="$1"
  local label="$2"
  if [[ "$LAST_STATUS" != "$expected" ]]; then
    echo "[DEBUG] Response body for ${label}:"
    cat "$LAST_BODY_FILE" || true
    fail "${label} retornou HTTP ${LAST_STATUS} (esperado ${expected})"
  fi
  ok "${label} -> HTTP ${LAST_STATUS}"
}

assert_json_status_accepted() {
  local label="$1"
  python - "$LAST_BODY_FILE" "$label" <<'PY'
import json
import sys

body_path = sys.argv[1]
label = sys.argv[2]

with open(body_path, "r", encoding="utf-8") as f:
    data = json.load(f)

if data.get("status") != "accepted":
    raise SystemExit(f"{label}: campo status invalido ({data!r})")
PY
  ok "${label} -> body.status=accepted"
}

echo "[INFO] Iniciando PWA Quality Gate"
echo "[INFO] APP_BASE_URL=${APP_BASE_URL}"
echo "[INFO] API_BASE_URL=${API_BASE_URL}"

for route in $ROUTES_TO_CHECK; do
  perform_request "GET" "${APP_BASE_URL}${route}"
  assert_status "200" "GET ${route}"
done

perform_request "GET" "${APP_BASE_URL}/manifest.json"
assert_status "200" "GET /manifest.json"

perform_request "GET" "${APP_BASE_URL}/sw.js"
assert_status "200" "GET /sw.js"

sw_cache_control="$(awk -F': ' 'tolower($1)=="cache-control" {print tolower($2)}' "$LAST_HEADERS_FILE" | tr -d '\r')"
[[ "$sw_cache_control" == *"no-cache"* ]] || fail "sw.js sem cache-control no-cache"
[[ "$sw_cache_control" == *"no-store"* ]] || fail "sw.js sem cache-control no-store"
ok "GET /sw.js -> cache-control contem no-cache e no-store"

perform_request "GET" "${APP_BASE_URL}/offline.html"
assert_status "200" "GET /offline.html"

perform_request "GET" "${API_BASE_URL}/readyz/"
assert_status "200" "GET /api/readyz/"

python - "$LAST_BODY_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

checks = data.get("checks") or {}
if data.get("status") != "ok":
    raise SystemExit(f"readyz status invalido: {data!r}")
if checks.get("database") != "ok":
    raise SystemExit(f"readyz database invalido: {data!r}")
if checks.get("cache") != "ok":
    raise SystemExit(f"readyz cache invalido: {data!r}")
PY
ok "GET /api/readyz/ -> status/checks ok"

vitals_payload='{"name":"LCP","value":1712.44,"rating":"good","path":"/musicos","release":"pwa-gate","ts":"2026-02-19T23:00:00Z"}'
perform_request "POST" "${API_BASE_URL}/vitals/" "$vitals_payload"
assert_status "202" "POST /api/vitals/"
assert_json_status_accepted "POST /api/vitals/"

pwa_payload='{"event":"pwa_auto_update_applied","data":{"source":"pwa_gate"},"path":"/musicos","release":"pwa-gate","ts":"2026-02-19T23:00:00Z"}'
perform_request "POST" "${API_BASE_URL}/analytics/pwa/" "$pwa_payload"
assert_status "202" "POST /api/analytics/pwa/"
assert_json_status_accepted "POST /api/analytics/pwa/"

echo "[INFO] PWA Quality Gate finalizado com sucesso."
