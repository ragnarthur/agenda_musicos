# CI/CD em Producao

Este projeto usa GitHub Actions com dois workflows:

- `CI` (`.github/workflows/ci.yml`): testes/lint/build backend e frontend + gate PWA bloqueante.
- `CD Production` (`.github/workflows/cd-production.yml`): deploy no servidor de producao via runner self-hosted.

## O que ja foi configurado

- Runner self-hosted instalado e ativo no servidor:
  - Nome: `srv1252721-prod`
  - Labels: `self-hosted`, `prod-server`
  - Service: `actions.runner.ragnarthur-agenda_musicos.srv1252721-prod.service`
- Secrets do repositorio (mantidos para parametrizacao):
  - `PROD_HOST=181.215.134.53`
  - `PROD_USER=arthur`
  - `PROD_PORT=22`
  - `PROD_APP_DIR=/opt/agenda-musicos/agenda_musicos`
  - `PROD_SSH_KEY` (chave privada de deploy)
- Branch protection na `main`:
  - PR obrigatorio para merge.
  - Checks obrigatorios: `backend`, `frontend`, `pwa_gate`, `e2e`.
  - Resolucao de conversa obrigatoria.
- Environment `production` criado no GitHub.

## Fluxo automatico (push -> deploy)

1. Crie uma branch de feature:
   ```bash
   git checkout -b feat/minha-melhoria
   ```
2. Faça commit e push:
   ```bash
   git add .
   git commit -m "feat: minha melhoria"
   git push -u origin feat/minha-melhoria
   ```
3. Abra PR para `main`.
4. O workflow `CI` roda automaticamente.
5. Com `CI` verde, faça merge da PR.
6. Ao merge na `main`, o `CI` roda novamente.
7. Quando esse `CI` da `main` concluir com sucesso, o `CD Production` dispara automaticamente no runner do proprio servidor e executa:
   - `./deploy.sh deploy`
   - `./deploy.sh status`
   - `scripts/qa/pwa_gate.sh` (bloqueante)
   - `docker compose ... ps`

## Quality Gate PWA

- Script automatizado: `scripts/qa/pwa_gate.sh`
- Checklist de homologacao: `docs/qa/PWA_RELEASE_GATE.md`
- Runbook de incidente: `docs/qa/PWA_INCIDENT_RUNBOOK.md`

Exemplo de execucao manual:

```bash
APP_BASE_URL="https://gigflowagenda.com.br" \
API_BASE_URL="https://gigflowagenda.com.br/api" \
bash scripts/qa/pwa_gate.sh
```

## Disparo manual de deploy

1. Acesse **GitHub > Actions > CD Production > Run workflow**.
2. Escolha:
   - `deploy`: executa deploy completo.
   - `status`: apenas verifica status remoto.
3. Clique em **Run workflow**.

## Validacao no servidor

```bash
ssh arthur@181.215.134.53 "cd /opt/agenda-musicos/agenda_musicos && ./deploy.sh status"
ssh arthur@181.215.134.53 "cd /opt/agenda-musicos/agenda_musicos && docker compose --env-file .env.prod -f docker-compose.prod.yml ps"
```

## Troubleshooting rapido

- Runner offline:
  - No servidor: `sudo systemctl status actions.runner.ragnarthur-agenda_musicos.srv1252721-prod.service`
  - Reiniciar runner: `sudo systemctl restart actions.runner.ragnarthur-agenda_musicos.srv1252721-prod.service`
- CI passou, mas CD nao disparou:
  - Confira se o workflow com nome `CI` concluiu com `success` na branch `main`.
- Deploy executou, mas app indisponivel:
  - Rode `./deploy.sh status` e `docker compose ... logs --tail=200`.
