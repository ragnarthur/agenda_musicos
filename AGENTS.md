# Repository Guidelines

## Estrutura do Projeto
- Backend Django/DRF em `agenda/` (models, serializers, views, validators, management commands). Configurações em `config/settings.py`; `.env` define `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `CSP_HEADER`.
- Frontend React + Vite + TypeScript em `frontend/src` (páginas, componentes, hooks, serviços). Build de produção em `frontend/dist` servido pelo nginx. Configure `VITE_API_URL` no `frontend/.env` (ex.: `https://seu-domínio/api`) usando o modelo `frontend/.env.example`.
- Scripts e infra: `update.sh` (deploy completo), `supervisor.conf` e `nginx.conf`, testes rápidos em `test_complete_workflow.py` e `test_auth.py`.

## Build, Teste e Desenvolvimento
- Ambiente Python: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`.
- Migrações e seed: `python manage.py migrate` e `python manage.py populate_db` (gera usuários de teste); admin padrão: `admin` / `admin2025@`.
- Servidor local: `python manage.py runserver 0.0.0.0:8000`.
- Testes backend: `python manage.py test` (regressão); fluxo ponta a ponta contra a API configurada: `python test_complete_workflow.py` (usa `BASE_URL` ou padrão ngrok).
- Frontend: `cd frontend && npm install`; dev `npm run dev`; build `npm run build`; checagem `npm run lint`.

## Estilo de Código e Convenções
- Python: PEP8, indentação 4 espaços, funções/campos em `snake_case`, classes em `PascalCase`. Centralize regras de negócio nas views/serializers e mantenha validações no backend (buffers, cruzar meia-noite etc.).
- React/TS: componentes em `PascalCase`, hooks/utils em `camelCase`, preferir funções puras. Centralize chamadas HTTP em `src/services` e leia `VITE_API_URL` do `.env` do frontend.
- Textos em PT-BR; evite hardcodes de hosts ou tokens. Sempre ler configurações de ambiente.

## Testes e Qualidade
- Cubra cenários de disponibilidade (com buffer de 40 min) e eventos que cruzam meia-noite. Verifique restauração de disponibilidade ao cancelar/deletar/rejeitar eventos.
- Antes de abrir PR, rode: `python manage.py test`, `python test_complete_workflow.py` (se a API estiver acessível) e `npm run lint`.

## Commits e Pull Requests
- Commits curtos e imperativos no padrão observado (`feat: ...`, `fix: ...`, `chore: ...`). Inclua migrations e ajustes de seed quando alterar modelos.
- PRs: descreva problema/solução, comandos executados, resultados de testes e evidências visuais para mudanças de UI. Aponte qualquer atualização necessária em `.env` ou scripts de deploy.

## Segurança e Deploy
- Nunca versionar secrets; use `.env` (backend) e `.env.local` (frontend). Backend lê `DATABASE_URL` via `dj-database-url` e armazena JWTs em cookies HttpOnly (não há tokens em localStorage).
- Após deploy, verifique `/var/www/agenda-musicos/logs/django.log` (permissões e rotação) e confirme que `VITE_API_URL` aponta para o ngrok/host atual.
- Deploy típico: `ssh ...`; `sudo -u www-data git pull origin main`; `cd frontend && sudo -u www-data npm ci && sudo -u www-data npm run build`; `cd .. && sudo supervisorctl restart agenda-musicos-group:agenda-musicos && sudo systemctl restart nginx`.
