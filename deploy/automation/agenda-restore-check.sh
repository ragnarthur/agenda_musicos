#!/usr/bin/env bash
set -Eeuo pipefail

# shellcheck disable=SC1091
source /usr/local/sbin/agenda-common.sh

load_app_env

latest_backup="$(ls -1t "$BACKUP_DIR"/db-*.dump 2>/dev/null | head -n1 || true)"
if [ -z "$latest_backup" ]; then
  notify_alert "[Agenda][Restore] Falha" "Nenhum backup encontrado em $BACKUP_DIR para validação de restore."
  exit 1
fi

tmp_db="restorecheck_$(date '+%Y%m%d_%H%M%S')"
tmp_dump="/tmp/${tmp_db}.dump"

cleanup() {
  run_compose exec -T db rm -f "$tmp_dump" >/dev/null 2>&1 || true
  run_compose exec -T db psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$tmp_db\" WITH (FORCE);" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "Iniciando restore-check com backup: $latest_backup"
run_compose exec -T db psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$tmp_db\";" >/dev/null
cat "$latest_backup" | run_compose exec -T db sh -c "cat > '$tmp_dump'"
run_compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$tmp_db" --no-owner --no-privileges "$tmp_dump" >/dev/null

table_count="$(run_compose exec -T db psql -U "$POSTGRES_USER" -d "$tmp_db" -At -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")"
if [ "${table_count:-0}" -le 0 ]; then
  notify_alert "[Agenda][Restore] Falha" "Restore concluído sem tabelas públicas no DB temporário ($tmp_db)."
  exit 1
fi

log "Restore-check concluído com sucesso. Tabelas públicas restauradas: $table_count"
