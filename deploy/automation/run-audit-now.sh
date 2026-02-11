#!/usr/bin/env bash
set -Eeuo pipefail

SERVER="${1:-arthur@181.215.134.53}"
SUDO_PASSWORD="${SUDO_PASSWORD:-${2:-}}"
TO_EMAIL="${3:-gigflowagenda@gmail.com}"
if [ -z "$SUDO_PASSWORD" ]; then
  echo "Use: SUDO_PASSWORD='...' $0 [user@host] [optional_password] [to_email]"
  exit 1
fi

ssh "$SERVER" "printf '%s\\n' '$SUDO_PASSWORD' | sudo -S -p '' /usr/local/sbin/agenda-send-audit-email.sh '$TO_EMAIL'"
ssh "$SERVER" "printf '%s\\n' '$SUDO_PASSWORD' | sudo -S -p '' tail -n 60 /var/log/agenda-audit-email.log"
