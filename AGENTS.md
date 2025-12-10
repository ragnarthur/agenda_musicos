# Repository Guidelines

## Project Structure & Module Organization
- `manage.py` and `config/` hold the Django entrypoint and settings (REST, JWT, CORS, DB). Keep environment-specific values in `.env`.
- `agenda/` is the main app with models, serializers, permissions, viewsets, and Django tests; add new APIs here following DRF patterns.
- `frontend/` contains the Vite + React + TypeScript client (`src/pages`, `components`, `contexts`, `services`). Build artifacts live in `frontend/dist`.
- Deployment and ops scripts: `setup.sh`, `update.sh`, `nginx.conf`, `supervisor.conf`. Do not edit without coordinating with infra.

## Build, Test, and Development Commands
- Backend env: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`.
- Run server: `python manage.py migrate && python manage.py populate_db && python manage.py runserver 0.0.0.0:8000`.
- Backend tests: `python manage.py test`. Use `python test_auth.py` for quick JWT sanity checks.
- Frontend setup: `cd frontend && npm install`.
- Frontend dev server: `npm run dev` (default http://localhost:5173).
- Frontend quality gates: `npm run lint` and `npm run build`; `npm run preview` to spot-check production build.

## Coding Style & Naming Conventions
- Python: follow PEP8 (4-space indent, `snake_case` functions/fields, `PascalCase` models/serializers). Prefer DRF viewsets and serializers per resource; keep permissions explicit.
- React/TypeScript: `PascalCase` components and file names in `pages`/`components`; `camelCase` hooks and helpers; co-locate API clients under `src/services`.
- Keep strings and URLs centralized in services; avoid inline config drift between frontend and backend.
- Run `npm run lint` before opening a PR; format TSX consistently (ESLint + TypeScript defaults).

## Testing Guidelines
- Primary suite: `python manage.py test` (Django test runner under `agenda/`). Add new tests near the code they cover.
- Smoke scripts: `test_auth.py` and `test_complete_workflow.py` validate JWT auth and happy paths; update expected users/roles when seed data changes.
- For frontend changes, at minimum run `npm run build` and exercise the affected page in dev/preview. Add integration tests via React Testing Library if you introduce complex logic.

## Commit & Pull Request Guidelines
- Commits are short, imperative summaries (e.g., “Corrigir erro ao cadastrar disponibilidades do líder”, “Add comprehensive testing”). Prefix with `fix:`/`chore:`/`feat:` when useful; Portuguese or English is fine—stay consistent inside a PR.
- Keep commits scoped and revert-free; include relevant migrations and seed updates.
- PRs should describe the change, link issues/tasks, list commands run, and include screenshots or GIFs for UI tweaks. Call out breaking changes or required env var updates.
- Ensure backend tests and `npm run build`/`lint` pass before requesting review; mention any skipped checks explicitly.

## Security & Configuration Tips
- Never commit secrets; rely on `.env` for `SECRET_KEY`, DB credentials, and `CORS_ORIGINS`.
- When changing CORS/hosts, update both Django settings and any frontend base URLs in `src/services/api.ts` (or equivalent) to stay aligned.
- For production updates, prefer `./update.sh` on the server to keep services, migrations, and frontend builds in sync.
