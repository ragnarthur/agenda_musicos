#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-${LOCUST_HOST:-http://127.0.0.1:8000}}"
INTERVAL="${MONITOR_INTERVAL:-2}"

while true; do
  clear
  echo "=== Load Test Live Monitor ==="
  echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Host: $HOST"
  echo ""

  echo "[readyz]"
  curl -sS "$HOST/api/readyz/" || echo "readyz indisponivel"
  echo ""
  echo ""

  echo "[processos django/gunicorn/python]"
  ps -axo pid,ppid,%cpu,%mem,rss,command | grep -E "gunicorn|manage.py|python" | grep -v grep | head -n 15
  echo ""

  echo "[load average]"
  uptime
  echo ""

  echo "[memoria]"
  vm_stat | head -n 7
  sleep "$INTERVAL"
done
