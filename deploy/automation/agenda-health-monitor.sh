#!/usr/bin/env bash
set -Eeuo pipefail

NO_ALERT=0
if [ "${1:-}" = "--no-alert" ]; then
  NO_ALERT=1
fi

# shellcheck disable=SC1091
source /usr/local/sbin/agenda-common.sh

load_app_env

STATE_FILE="/var/tmp/agenda-health.state"
ISSUES_FILE="/var/log/agenda-health-last-issues.log"
issues=()

root_usage="$(df -P / | awk 'NR==2 {gsub("%", "", $5); print $5}')"
if [ "${root_usage:-0}" -ge "$DISK_THRESHOLD" ]; then
  issues+=("Disco da raiz em ${root_usage}% (limite ${DISK_THRESHOLD}%)")
fi

docker_usage="$(df -P /var/lib/docker 2>/dev/null | awk 'NR==2 {gsub("%", "", $5); print $5}' || true)"
if [ -n "$docker_usage" ] && [ "$docker_usage" -ge "$DISK_THRESHOLD" ]; then
  issues+=("Disco em /var/lib/docker em ${docker_usage}% (limite ${DISK_THRESHOLD}%)")
fi

running_services="$(run_compose ps --status running --services 2>/dev/null || true)"
for svc in db redis backend frontend nginx; do
  if ! grep -qx "$svc" <<<"$running_services"; then
    issues+=("Serviço '${svc}' não está em execução")
  fi
done

health_target="$HEALTH_URL"
if [ -z "$health_target" ]; then
  health_target="${FRONTEND_URL:-http://127.0.0.1}"
fi
if ! curl -kfsS --max-time 15 "$health_target" >/dev/null; then
  issues+=("URL de health indisponível: $health_target")
fi

latest_backup="$(ls -1t "$BACKUP_DIR"/db-*.dump 2>/dev/null | head -n1 || true)"
if [ -z "$latest_backup" ]; then
  issues+=("Nenhum backup encontrado em $BACKUP_DIR")
else
  backup_age_h="$(( ( $(date +%s) - $(stat -c %Y "$latest_backup") ) / 3600 ))"
  if [ "$backup_age_h" -gt 30 ]; then
    issues+=("Backup mais recente com $backup_age_h horas: $latest_backup")
  fi
fi

previous_state="$(cat "$STATE_FILE" 2>/dev/null || true)"
if [ "${#issues[@]}" -gt 0 ]; then
  issue_text="$(printf '%s\n' "${issues[@]}")"
  current_hash="ALERT:$(printf '%s' "$issue_text" | sha256sum | awk '{print $1}')"
  printf '%s\n' "$issue_text" > "$ISSUES_FILE"
  printf '%s\n' "$current_hash" > "$STATE_FILE"

  if [ "$NO_ALERT" -eq 0 ] && [ "$previous_state" != "$current_hash" ]; then
    notify_alert "[Agenda][Health] Alerta no servidor $(hostname)" "$(printf 'Detectado em %s\n\n%s' "$(date -Iseconds)" "$issue_text")"
  fi

  log "Health monitor detectou problemas: $(tr '\n' '; ' <<<"$issue_text")"
  exit 1
fi

printf '%s\n' "OK" > "$STATE_FILE"
if [ "$NO_ALERT" -eq 0 ] && [[ "$previous_state" == ALERT:* ]]; then
  notify_alert "[Agenda][Health] Recuperado $(hostname)" "Todos os checks voltaram ao normal em $(date -Iseconds)."
fi

log "Health monitor OK"
