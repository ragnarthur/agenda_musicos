#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[prepare] aplicando migracoes..."
python manage.py migrate

echo "[prepare] criando musicos de teste..."
python manage.py seed_test_data --days "${SEED_DAYS:-14}"

echo "[prepare] criando eventos demo (inclui pendentes e confirmados)..."
python manage.py seed_demo_events --clear

echo "[prepare] pronto."
