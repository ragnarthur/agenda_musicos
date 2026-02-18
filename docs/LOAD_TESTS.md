# Plano de Testes de Carga e Performance

Este guia implementa o plano de carga com Locust em uma esteira executavel.

## 1. Pre-requisitos

```bash
source .venv/bin/activate
pip install -r requirements-loadtest.txt
```

## 2. Preparar dados locais

Se voce estiver fora do Docker Compose completo, suba apenas banco e redis:

```bash
docker compose -f docker-compose.dev.yml up -d db redis
```

E rode os comandos Django com:

```bash
export DATABASE_URL='postgresql://agenda:agenda@localhost:5433/agenda'
export REDIS_URL='redis://localhost:6379/1'
export DEBUG='True'
export COOKIE_SECURE='False'
```

`COOKIE_SECURE=False` e necessario para teste local em `http://`, porque o login usa cookies JWT.

```bash
./load_tests/scripts/prepare_local_data.sh
```

Isso cria usuarios e eventos de teste para cenarios de leitura e escrita.

## 3. Rodar servidor local

```bash
python manage.py runserver
```

## 4. Smoke test (terminal)

```bash
./load_tests/scripts/run_smoke.sh
```

Saida visual no terminal:
- Tabela de requests por endpoint
- `RPS`, `Fails/s`, `Avg`, `Min`, `Max`, `p50`, `p95`, `p99`
- Resumo final com gate de qualidade (`fail_ratio` e `p95`)

Arquivos gerados:
- `load_tests/results/*_stats.csv`
- `load_tests/results/*_failures.csv`

## 5. Monitoramento visual em paralelo

Em outro terminal:

```bash
./load_tests/scripts/live_monitor.sh http://127.0.0.1:8000
```

Voce acompanha:
- `GET /api/readyz/`
- processos (`gunicorn/manage.py/python`)
- load average e memoria

## 6. Perfil completo de stress (fases)

```bash
LOCUST_ENABLE_WRITE_TASKS=true ./load_tests/scripts/run_stress_profile.sh
```

Fases implementadas:
1. `f1-ramp-100` (0 -> 100, `spawn_rate=0.4`, 6 min)
2. `f2-const-100` (100 estavel, `spawn_rate=0.4`, 5 min)
3. `f3-ramp-300` (rampa para alvo 300, `spawn_rate=0.4`, 10 min, concorrencia efetiva ~240)
4. `f4-const-300` (300 alvo, `spawn_rate=0.4`, 5 min)
5. `f5-break-{500,700,900}` (`spawn_rate=0.4`, 10 min por fase)

Observacoes de alinhamento com CI/CD:
- `LOCUST_WEIGHT_AUTH=0` por padrao no script de stress para evitar flood de login durante a rampa.
- O comportamento acima esta alinhado com o workflow `cd-production.yml` no modo `load-test`.

## 7. Variaveis de ambiente principais

- `LOCUST_HOST` (default `http://127.0.0.1:8000`)
- `LOCUST_MUSICIAN_USERNAME` / `LOCUST_MUSICIAN_PASSWORD`
- `LOCUST_CONTRACTOR_EMAIL` / `LOCUST_CONTRACTOR_PASSWORD`
- `LOCUST_ENABLE_WRITE_TASKS` (`false` por default)
- `LOCUST_WEIGHT_AUTH` (default `0` no `run_stress_profile.sh`)
- `LOCUST_MAX_FAIL_RATIO` (default `0.05`)
- `LOCUST_MAX_P95_MS` (default `1200`)

## 8. Observacoes de seguranca operacional

- Escrita (`POST /api/events/` e `set_availability`) vem desativada por default.
- Para ambiente compartilhado/producao, use staging e dados isolados antes de habilitar escrita.
