#!/usr/bin/env bash
set -Eeuo pipefail

CONF_FILE="/etc/agenda-health.conf"
APP_DIR_DEFAULT="/opt/agenda-musicos/agenda_musicos"

if [ -f "$CONF_FILE" ]; then
  # shellcheck disable=SC1091
  source "$CONF_FILE"
fi

APP_DIR="${APP_DIR:-$APP_DIR_DEFAULT}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.prod}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/agenda-musicos}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
DISK_THRESHOLD="${DISK_THRESHOLD:-85}"
HEALTH_URL="${HEALTH_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
TELEGRAM_ALERT_CHAT_ID="${TELEGRAM_ALERT_CHAT_ID:-}"

log() {
  printf '%s %s\n' "$(date '+%F %T')" "$*"
}

load_app_env() {
  local key line value
  local keys=(
    POSTGRES_DB
    POSTGRES_USER
    POSTGRES_PASSWORD
    EMAIL_HOST
    EMAIL_PORT
    EMAIL_USE_TLS
    EMAIL_HOST_USER
    EMAIL_HOST_PASSWORD
    DEFAULT_FROM_EMAIL
    TELEGRAM_BOT_TOKEN
    ADMIN_EMAILS
    FRONTEND_URL
  )

  [ -f "$ENV_FILE" ] || return 0

  for key in "${keys[@]}"; do
    line="$(grep -m1 -E "^${key}=" "$ENV_FILE" || true)"
    [ -n "$line" ] || continue
    value="${line#*=}"
    value="${value%$'\r'}"

    # Remove outer quotes when present to normalize .env values.
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    printf -v "$key" '%s' "$value"
    export "$key"
  done
}

get_alert_email() {
  if [ -n "${ALERT_EMAIL:-}" ]; then
    echo "$ALERT_EMAIL"
    return
  fi

  if [ -n "${ADMIN_EMAILS:-}" ]; then
    echo "${ADMIN_EMAILS%%,*}"
    return
  fi

  echo "gigflowagenda@gmail.com"
}

run_compose() {
  (
    cd "$APP_DIR"
    docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml "$@"
  )
}

send_email() {
  local subject="${1:-}"
  local body="${2:-}"
  local to="${3:-}"

  load_app_env

  if [ -z "$to" ]; then
    to="$(get_alert_email)"
  fi

  python3 - "$subject" "$body" "$to" <<'PY'
import os
import ssl
import sys
import smtplib
from email.message import EmailMessage

subject, body, to_addr = sys.argv[1], sys.argv[2], sys.argv[3]
host = os.getenv("EMAIL_HOST", "").strip()
port = int((os.getenv("EMAIL_PORT", "587") or "587").strip())
user = os.getenv("EMAIL_HOST_USER", "").strip()
password = os.getenv("EMAIL_HOST_PASSWORD", "").strip()
use_tls = (os.getenv("EMAIL_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"})
from_addr = (os.getenv("DEFAULT_FROM_EMAIL", "").strip() or user or "noreply@localhost")

if not host:
    print("EMAIL_HOST não configurado", file=sys.stderr)
    sys.exit(2)

msg = EmailMessage()
msg["Subject"] = subject
msg["From"] = from_addr
msg["To"] = to_addr
msg.set_content(body)

server = smtplib.SMTP(host, port, timeout=25)
try:
    if use_tls:
        server.starttls(context=ssl.create_default_context())
    if user and password:
        server.login(user, password)
    server.send_message(msg)
finally:
    server.quit()

print("email_sent")
PY
}

send_telegram() {
  local message="${1:-}"
  local chat_id="${2:-$TELEGRAM_ALERT_CHAT_ID}"

  load_app_env

  local bot_token="${TELEGRAM_BOT_TOKEN:-}"
  if [ -z "$bot_token" ] || [ -z "$chat_id" ]; then
    return 0
  fi

  curl -fsS -X POST "https://api.telegram.org/bot${bot_token}/sendMessage" \
    --data-urlencode "chat_id=${chat_id}" \
    --data-urlencode "text=${message}" >/dev/null
}

notify_alert() {
  local subject="${1:-[Agenda] Alerta}"
  local body="${2:-Sem detalhes}"

  send_email "$subject" "$body" || log "Falha ao enviar e-mail de alerta"
  send_telegram "$subject\n\n$body" || log "Falha ao enviar alerta no Telegram"
}
