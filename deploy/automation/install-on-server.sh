#!/usr/bin/env bash
set -Eeuo pipefail

SERVER="${1:-arthur@181.215.134.53}"
SUDO_PASSWORD="${SUDO_PASSWORD:-${2:-}}"
if [ -z "$SUDO_PASSWORD" ]; then
  echo "Use: SUDO_PASSWORD='...' $0 [user@host]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

retry() {
  local n=0
  local max=12
  local delay=5
  until "$@"; do
    n=$((n + 1))
    if [ "$n" -ge "$max" ]; then
      echo "Falhou após $n tentativas: $*" >&2
      return 1
    fi
    sleep "$delay"
  done
}

send_file() {
  local file="$1"
  retry bash -lc "cat '$SCRIPT_DIR/$file' | ssh -o ConnectTimeout=8 '$SERVER' 'cat > /tmp/$file'"
}

send_file agenda-common.sh
send_file agenda-backup.sh
send_file agenda-restore-check.sh
send_file agenda-health-monitor.sh
send_file agenda-send-audit-email.sh
send_file agenda-health.conf
send_file agenda_automation.cron
send_file agenda-automation.logrotate

retry ssh "$SERVER" "
set -e
PASS='$SUDO_PASSWORD'
printf '%s\\n' \"\$PASS\" | sudo -S -p '' install -m 750 -o root -g root /tmp/agenda-common.sh /usr/local/sbin/agenda-common.sh
printf '%s\\n' \"\$PASS\" | sudo -S -p '' install -m 750 -o root -g root /tmp/agenda-backup.sh /usr/local/sbin/agenda-backup.sh
printf '%s\\n' \"\$PASS\" | sudo -S -p '' install -m 750 -o root -g root /tmp/agenda-restore-check.sh /usr/local/sbin/agenda-restore-check.sh
printf '%s\\n' \"\$PASS\" | sudo -S -p '' install -m 750 -o root -g root /tmp/agenda-health-monitor.sh /usr/local/sbin/agenda-health-monitor.sh
printf '%s\\n' \"\$PASS\" | sudo -S -p '' install -m 750 -o root -g root /tmp/agenda-send-audit-email.sh /usr/local/sbin/agenda-send-audit-email.sh
printf '%s\\n' \"\$PASS\" | sudo -S -p '' install -m 640 -o root -g root /tmp/agenda-health.conf /etc/agenda-health.conf
printf '%s\\n' \"\$PASS\" | sudo -S -p '' install -m 644 -o root -g root /tmp/agenda_automation.cron /etc/cron.d/agenda_automation
printf '%s\\n' \"\$PASS\" | sudo -S -p '' install -m 644 -o root -g root /tmp/agenda-automation.logrotate /etc/logrotate.d/agenda-automation
printf '%s\\n' \"\$PASS\" | sudo -S -p '' mkdir -p /opt/backups/agenda-musicos /var/log/agenda-audit
printf '%s\\n' \"\$PASS\" | sudo -S -p '' touch /var/log/agenda-backup.log /var/log/agenda-restore-check.log /var/log/agenda-health-monitor.log /var/log/agenda-audit-email.log /var/log/agenda-health-last-issues.log
printf '%s\\n' \"\$PASS\" | sudo -S -p '' chown root:adm /var/log/agenda-backup.log /var/log/agenda-restore-check.log /var/log/agenda-health-monitor.log /var/log/agenda-audit-email.log /var/log/agenda-health-last-issues.log
printf '%s\\n' \"\$PASS\" | sudo -S -p '' chmod 640 /var/log/agenda-backup.log /var/log/agenda-restore-check.log /var/log/agenda-health-monitor.log /var/log/agenda-audit-email.log /var/log/agenda-health-last-issues.log
printf '%s\\n' \"\$PASS\" | sudo -S -p '' bash -n /usr/local/sbin/agenda-common.sh
printf '%s\\n' \"\$PASS\" | sudo -S -p '' bash -n /usr/local/sbin/agenda-backup.sh
printf '%s\\n' \"\$PASS\" | sudo -S -p '' bash -n /usr/local/sbin/agenda-restore-check.sh
printf '%s\\n' \"\$PASS\" | sudo -S -p '' bash -n /usr/local/sbin/agenda-health-monitor.sh
printf '%s\\n' \"\$PASS\" | sudo -S -p '' bash -n /usr/local/sbin/agenda-send-audit-email.sh
"

echo "Instalação concluída em $SERVER"
