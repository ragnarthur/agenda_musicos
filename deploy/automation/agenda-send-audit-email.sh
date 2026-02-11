#!/usr/bin/env bash
set -Eeuo pipefail

# shellcheck disable=SC1091
source /usr/local/sbin/agenda-common.sh

load_app_env
mkdir -p /var/log/agenda-audit

timestamp="$(date '+%Y%m%d-%H%M%S')"
report_file="/var/log/agenda-audit/agenda-audit-${timestamp}.txt"

audit_to="${1:-gigflowagenda@gmail.com}"
if [ -z "$audit_to" ]; then
  audit_to="gigflowagenda@gmail.com"
fi

health_status="OK"
if ! /usr/local/sbin/agenda-health-monitor.sh --no-alert >/dev/null 2>&1; then
  health_status="ALERTA"
fi

latest_backup="$(ls -1t "$BACKUP_DIR"/db-*.dump 2>/dev/null | head -n1 || true)"

{
  echo "Relatorio Auditavel - Agenda Musicos"
  echo "Gerado em: $(date -Iseconds)"
  echo "Servidor: $(hostname)"
  echo ""
  echo "Status geral de health: $health_status"
  echo ""
  echo "1) Cron configurado"
  for f in /etc/cron.d/agenda_weekly_cleanup /etc/cron.d/agenda_automation; do
    if [ -f "$f" ]; then
      echo "--- $f"
      sed -n '/^[^#].*/p' "$f"
    fi
  done
  echo ""
  echo "2) Containers"
  run_compose ps
  echo ""
  echo "3) Uso de disco"
  df -h /
  df -h /var/lib/docker 2>/dev/null || true
  echo ""
  echo "4) Backup"
  if [ -n "$latest_backup" ]; then
    ls -lh "$latest_backup"
    sha256sum "$latest_backup"
  else
    echo "Nenhum backup encontrado em $BACKUP_DIR"
  fi
  echo ""
  echo "5) Ultimos logs"
  for logf in /var/log/agenda-weekly-cleanup.log /var/log/agenda-backup.log /var/log/agenda-restore-check.log /var/log/agenda-health-monitor.log; do
    if [ -f "$logf" ]; then
      echo "--- tail $logf"
      tail -n 20 "$logf"
    fi
  done
} > "$report_file"

subject="[Agenda][Audit] Relatorio ${timestamp} - ${health_status}"
body="$(cat "$report_file")"

send_email "$subject" "$body" "$audit_to"
log "Relatório auditável enviado para $audit_to e salvo em $report_file"
