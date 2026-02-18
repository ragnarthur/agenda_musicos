#!/usr/bin/env bash

set -euo pipefail

REMOTE_USER="${REMOTE_USER:-arthur}"
REMOTE_HOST="${REMOTE_HOST:-181.215.134.53}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_PATH="${REMOTE_PATH:-/opt/agenda-musicos/agenda_musicos}"

MAX_ATTEMPTS="${MAX_ATTEMPTS:-4}"
BASE_WAIT_SECONDS="${BASE_WAIT_SECONDS:-25}"
CONNECT_TIMEOUT_SECONDS="${CONNECT_TIMEOUT_SECONDS:-10}"

if [ "$#" -gt 0 ]; then
  REMOTE_CMD="$*"
else
  REMOTE_CMD="cd ${REMOTE_PATH} && exec bash -l"
fi

SSH_OPTS=(
  -o BatchMode=yes
  -o ConnectTimeout="${CONNECT_TIMEOUT_SECONDS}"
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=3
  -o StrictHostKeyChecking=accept-new
  -p "${REMOTE_PORT}"
)

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "[prod-ssh] tentativa ${attempt}/${MAX_ATTEMPTS}..."

  if ssh "${SSH_OPTS[@]}" "${REMOTE_USER}@${REMOTE_HOST}" "$REMOTE_CMD"; then
    exit 0
  fi

  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
    break
  fi

  wait_seconds=$((BASE_WAIT_SECONDS * attempt))
  echo "[prod-ssh] falha de conexao. aguardando ${wait_seconds}s antes da proxima tentativa..."
  sleep "$wait_seconds"

  attempt=$((attempt + 1))
done

echo "[prod-ssh] nao foi possivel conectar apos ${MAX_ATTEMPTS} tentativas." >&2
exit 1
