# Load Tests (Locust)

Suite de teste de carga para endpoints principais da API.

## Cenarios cobertos

- `POST /api/token/` (reautenticacao)
- `GET /api/events/`
- `GET /api/musicians/`
- `POST /api/events/` (opcional, controlado por env)
- `GET /api/events/{id}/`
- `POST /api/events/{id}/set_availability/` (opcional, controlado por env)

## Execucao rapida

```bash
source .venv/bin/activate
pip install -r requirements-loadtest.txt
docker compose -f docker-compose.dev.yml up -d db redis

export DATABASE_URL='postgresql://agenda:agenda@localhost:5433/agenda'
export REDIS_URL='redis://localhost:6379/1'
export DEBUG='True'
export COOKIE_SECURE='False'

# terminal 1
python manage.py runserver

# terminal 2
./load_tests/scripts/run_smoke.sh
```

Sem `COOKIE_SECURE=False` no ambiente local HTTP, os endpoints autenticados retornam `401`.

## UI web do Locust

```bash
locust -f load_tests/locustfile.py --host http://127.0.0.1:8000
```

Abra: `http://127.0.0.1:8089`
