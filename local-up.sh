#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Comando obrigatório não encontrado: $1"
    exit 1
  fi
}

require_file() {
  if [ ! -f "$1" ]; then
    echo "❌ Arquivo obrigatório não encontrado: $1"
    exit 1
  fi
}

# =============================================================================
# Funções de Carregamento de Ambiente
# =============================================================================

load_env_vars() {
  local env_file="$1"
  if [ ! -f "$env_file" ]; then
    echo "⚠️  Arquivo não encontrado: $env_file"
    return 1
  fi
  
  echo "📦 Carregando variáveis de $env_file..."
  
  # Exportar variáveis do arquivo
  while IFS= read -r line || [ -n "$line" ]; do
    # Ignorar linhas vazias e comentários
    [[ -z "$line" || "$line" =~ ^#.* ]] && continue
    
    # Extrair key e value
    local key="${line%%=*}"
    local value="${line#*=}"
    
    # Remover aspas se existirem
    value="${value%\"}"
    value="${value#\"}"
    
    export "$key=$value"
  done < "$env_file"
  
  echo "✅ Variáveis carregadas de $env_file"
  return 0
}

# =============================================================================
# Funções Auxiliares
# =============================================================================

cleanup() {
  echo ""
  echo "🛑 Encerrando serviços locais..."
  kill "${BACKEND_PID:-}" "${PAYMENT_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

require_cmd docker
require_cmd npm
require_file "$ROOT_DIR/.env.local"
require_file "$ROOT_DIR/frontend/.env.local"
require_file "$ROOT_DIR/payment-service/.env"

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker não está rodando. Abra o Docker Desktop e tente novamente."
  exit 1
fi

echo "🐘 Subindo Postgres (Docker)..."
docker compose -f "$ROOT_DIR/docker-compose.dev.yml" up -d db

if [ ! -f "$ROOT_DIR/.venv/bin/activate" ]; then
  echo "❌ Ambiente virtual não encontrado em $ROOT_DIR/.venv"
  echo "   Crie a venv e instale dependências antes de continuar."
  exit 1
fi

echo "🔄 Aplicando migrations..."
source "$ROOT_DIR/.venv/bin/activate"
(cd "$ROOT_DIR" && ./dev.sh migrate)

echo "🚀 Subindo backend Django..."
(cd "$ROOT_DIR" && ./dev.sh start) &
BACKEND_PID=$!

echo "💳 Subindo payment-service..."
(cd "$ROOT_DIR/payment-service" && npm run dev) &
PAYMENT_PID=$!

echo "🌐 Subindo frontend..."
(cd "$ROOT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "✅ Ambiente local pronto:"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   Payments: http://localhost:3002"
echo ""
echo "Pressione Ctrl+C para encerrar."

wait
