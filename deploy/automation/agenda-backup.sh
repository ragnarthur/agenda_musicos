#!/usr/bin/env bash
set -Eeuo pipefail

# shellcheck disable=SC1091
source /usr/local/sbin/agenda-common.sh

load_app_env
mkdir -p "$BACKUP_DIR"

LOCK_FILE="/var/lock/agenda-backup.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Backup já está em execução; saindo"
  exit 0
fi

timestamp="$(date '+%Y%m%d-%H%M%S')"
backup_file="$BACKUP_DIR/db-${timestamp}.dump"
tmp_file="${backup_file}.tmp"
meta_file="$BACKUP_DIR/db-${timestamp}.meta"

log "Iniciando backup do banco em $backup_file"
if ! run_compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$tmp_file"; then
  rm -f "$tmp_file"
  notify_alert "[Agenda][Backup] Falha" "Falha ao executar pg_dump em $(hostname) às $(date -Iseconds)."
  exit 1
fi

mv "$tmp_file" "$backup_file"
sha256="$(sha256sum "$backup_file" | awk '{print $1}')"
size_h="$(du -h "$backup_file" | awk '{print $1}')"

cat > "$meta_file" <<META
timestamp=$timestamp
host=$(hostname)
file=$backup_file
sha256=$sha256
size=$size_h
database=${POSTGRES_DB}
META

find "$BACKUP_DIR" -type f -name 'db-*.dump' -mtime +"$BACKUP_RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'db-*.meta' -mtime +"$BACKUP_RETENTION_DAYS" -delete

log "Backup concluído: $backup_file ($size_h) sha256=$sha256"
