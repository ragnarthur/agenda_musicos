# Automações de Saúde do Servidor

Este pacote instala 3 melhorias no servidor de produção:

1. Backup diário do Postgres com retenção.
2. Restore-check semanal (simulação real de restore em DB temporário).
3. Monitoramento contínuo (disco, containers, health URL, idade do backup) com alerta por e-mail e Telegram.

Também inclui o relatório auditável por e-mail para `gigflowagenda@gmail.com`.

## Arquivos instalados no servidor

- `/usr/local/sbin/agenda-common.sh`
- `/usr/local/sbin/agenda-backup.sh`
- `/usr/local/sbin/agenda-restore-check.sh`
- `/usr/local/sbin/agenda-health-monitor.sh`
- `/usr/local/sbin/agenda-send-audit-email.sh`
- `/etc/agenda-health.conf`
- `/etc/cron.d/agenda_automation`
- `/etc/logrotate.d/agenda-automation`

## Agendamentos (`/etc/cron.d/agenda_automation`)

- `20 2 * * *` backup diário
- `10 4 * * 1` restore-check semanal
- `*/5 * * * *` monitor de saúde
- `0 8 * * *` e-mail auditável diário

## Instalar no servidor

```bash
cd /Users/arthuraraujo/Projetos/agenda-musicos/deploy/automation
SUDO_PASSWORD='Antonella-Dogfunk123@' ./install-on-server.sh arthur@181.215.134.53
```

## Forçar envio de e-mail auditável agora

```bash
cd /Users/arthuraraujo/Projetos/agenda-musicos/deploy/automation
SUDO_PASSWORD='Antonella-Dogfunk123@' ./run-audit-now.sh arthur@181.215.134.53
```

## Verificações rápidas no servidor

```bash
ssh arthur@181.215.134.53 "sudo cat /etc/cron.d/agenda_automation"
ssh arthur@181.215.134.53 "sudo ls -lh /opt/backups/agenda-musicos | tail"
ssh arthur@181.215.134.53 "sudo tail -n 80 /var/log/agenda-health-monitor.log"
ssh arthur@181.215.134.53 "sudo tail -n 80 /var/log/agenda-restore-check.log"
ssh arthur@181.215.134.53 "sudo tail -n 80 /var/log/agenda-audit-email.log"
```

## Ajustes

Edite `/etc/agenda-health.conf` para:

- `ALERT_EMAIL` (já padrão em `gigflowagenda@gmail.com`)
- `TELEGRAM_ALERT_CHAT_ID`
- `HEALTH_URL`
- limites (`DISK_THRESHOLD`, retenção etc.)
