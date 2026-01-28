#!/bin/bash

# Script de Deploy - Campo State (UF)
# Executar no servidor com: bash deploy-state-field.sh
# Certifique-se de estar no diretório do projeto

set -e  # Para em caso de erro

echo "🚀 Iniciando deploy do campo State (UF)..."
echo ""

# Função de health check
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local service_name=$3
    local attempt=0

    echo "⏳ Aguardando $service_name ficar pronto..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo "✅ $service_name está pronto!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "   Tentativa $attempt/$max_attempts..."
        sleep 2
    done
    echo "❌ $service_name não iniciou após $((max_attempts * 2)) segundos"
    return 1
}

# 1. Pull do código
echo "📥 1. Fazendo git pull..."
git pull origin main
echo "✅ Git pull concluído"
echo ""

# 2. Rebuild backend (para aplicar migrations)
echo "🔨 2. Fazendo rebuild do backend..."
docker compose -f docker-compose.prod.yml build backend --no-cache
echo "✅ Build do backend concluído"
echo ""

# 3. Rebuild frontend (para aplicar mudanças de UI)
echo "🔨 3. Fazendo rebuild do frontend..."
docker compose -f docker-compose.prod.yml build frontend --no-cache
echo "✅ Build do frontend concluído"
echo ""

# 4. Restart dos serviços (migrations rodam automaticamente)
echo "🔄 4. Reiniciando serviços..."
docker compose -f docker-compose.prod.yml up -d backend frontend
echo "✅ Serviços reiniciados"
echo ""

# 5. Aguardar backend ficar pronto (com health check)
if ! wait_for_service "http://localhost:8000/healthz/" 15 "Backend"; then
    echo "⚠️  Warning: Backend pode não estar totalmente pronto"
    docker compose -f docker-compose.prod.yml logs --tail=20 backend
fi
echo ""

# 6. Aguardar frontend ficar pronto (com health check)
if ! wait_for_service "http://localhost" 10 "Frontend"; then
    echo "⚠️  Warning: Frontend pode não estar totalmente pronto"
    docker compose -f docker-compose.prod.yml logs --tail=20 frontend
fi
echo ""

# 7. Verificar migrations
echo "🔍 7. Verificando migrations aplicadas..."
docker compose -f docker-compose.prod.yml logs backend | grep "0024_add_state_to_musician" || echo "ℹ️  Migration não encontrada nos logs recentes"
echo ""

# 8. Verificar status dos containers
echo "📊 8. Status dos containers:"
docker compose -f docker-compose.prod.yml ps
echo ""

echo "✅ Deploy concluído com sucesso!"
echo ""
echo "🌐 Teste agora:"
echo "   1. Acesse: https://gigflowagenda.com.br/register"
echo "   2. Digite 'São Paulo' no campo cidade"
echo "   3. Deve aparecer dropdown com 'São Paulo - SP'"
echo ""
