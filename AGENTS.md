# Repository Guidelines

## Estrutura do Projeto
- Backend Django/DRF em `agenda/` (models, serializers, views, permissions, management command `populate_db`). Configurações em `config/settings.py` usam `.env` para `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` e CORS.
- Frontend Vite + React + TypeScript em `frontend/src` (páginas, componentes, contextos, serviços). Build vai para `frontend/dist` e é servido pelo nginx configurado em `nginx.conf`.
- Automação e deploy: `setup.sh` (bootstrap), `update.sh` (migrar, coletar estáticos, build frontend, restart supervisor/nginx), `supervisor.conf` (gunicorn) e arquivos de teste rápido (`test_auth.py`, `test_complete_workflow.py`).

## Configuração e Ambiente
- Crie `.venv` e instale deps: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`.
- Defina `.env` com `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` (inclua domínio do ngrok) e `CORS_ALLOWED_ORIGINS`/`CORS_ORIGINS`. O frontend lê `VITE_API_URL` em `.env` do `frontend` para apontar para o mesmo host.
- Banco padrão é SQLite (`db.sqlite3`). Para reset local: remova o arquivo, rode `python manage.py migrate && python manage.py populate_db`.

## Comandos de Build, Teste e Desenvolvimento
- Backend: `python manage.py migrate`, `python manage.py populate_db`, `python manage.py runserver 0.0.0.0:8000`.
- Testes backend: `python manage.py test`; fumo JWT: `python test_auth.py`; fluxo completo: `python test_complete_workflow.py`.
- Frontend: `cd frontend && npm install`; dev server `npm run dev`; qualidade `npm run lint`; build de produção `npm run build`; validação do build `npm run preview`.
- Deploy no servidor: `./update.sh` (executa migrações, coleta estáticos, builda frontend e reinicia serviços via supervisor/nginx).

## Estilo de Código e Nomes
- Python: PEP8 (4 espaços, `snake_case` para funções/campos, `PascalCase` para models/serializers). Views DRF com permissões explícitas; evite lógica de negócio duplicada.
- React/TS: componentes e arquivos em `PascalCase`, hooks/utilidades em `camelCase`. Centralize chamadas HTTP em `src/services/api.ts` e derive strings constantes lá.
- Antes de abrir PR, rode `npm run lint` e garanta que migrations/seed refletem as mudanças.

## Diretrizes de Commits e PRs
- Commits curtos e imperativos (ex.: `fix: ajustar divisão de disponibilidade`, `chore: atualizar seeds`). Inclua migrations e dados seeds relevantes.
- PRs devem descrever o problema/solução, comandos executados, checklist de testes e screenshots/GIFs para alterações de UI. Indique updates obrigatórios de `.env` ou scripts.
