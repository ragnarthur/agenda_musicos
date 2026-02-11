# CI/CD em Producao

Este projeto usa GitHub Actions com dois workflows:

- `CI` (`.github/workflows/ci.yml`): testes/lint/build backend e frontend.
- `CD Production` (`.github/workflows/cd-production.yml`): deploy no servidor de producao.

## O que ja foi configurado

- Secrets do repositorio:
  - `PROD_HOST=181.215.134.53`
  - `PROD_USER=arthur`
  - `PROD_PORT=22`
  - `PROD_APP_DIR=/opt/agenda-musicos/agenda_musicos`
  - `PROD_SSH_KEY` (chave privada de deploy)
- Branch protection na `main`:
  - PR obrigatorio para merge.
  - Checks obrigatorios: `backend`, `frontend`, `e2e`.
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
7. Quando esse `CI` da `main` concluir com sucesso, o `CD Production` dispara automaticamente e executa:
   - `./deploy.sh deploy` no servidor.
   - `./deploy.sh status` para validacao.
   - `docker compose ... ps` para confirmar stack.

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

- Falha de SSH no deploy:
  - Verifique se o host aceita conexao na porta 22.
  - Revalide a chave no secret `PROD_SSH_KEY`.
- CI passou, mas CD nao disparou:
  - Confira se o workflow com nome `CI` concluiu com `success` na branch `main`.
- Deploy executou, mas app indisponivel:
  - Rode `./deploy.sh status` e `docker compose ... logs --tail=200`.
