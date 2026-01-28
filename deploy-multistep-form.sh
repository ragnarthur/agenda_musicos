#!/bin/bash

# Script de Deploy - Formulário Multi-Step
# Executar no servidor com: bash deploy-multistep-form.sh
# Certifique-se de estar no diretório do projeto

set -e  # Para em caso de erro

echo "🚀 Iniciando deploy do formulário multi-step..."
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

# 2. Rebuild frontend (para aplicar novo formulário)
echo "🔨 2. Fazendo rebuild do frontend..."
docker compose -f docker-compose.prod.yml build frontend --no-cache
echo "✅ Build do frontend concluído"
echo ""

# 3. Restart do serviço frontend
echo "🔄 3. Reiniciando frontend..."
docker compose -f docker-compose.prod.yml up -d frontend
echo "✅ Frontend reiniciado"
echo ""

# 4. Aguardar frontend ficar pronto (com health check)
if ! wait_for_service "http://localhost" 15 "Frontend"; then
    echo "⚠️  Warning: Frontend pode não estar totalmente pronto"
    docker compose -f docker-compose.prod.yml logs --tail=20 frontend
fi
echo ""

# 5. Verificar status dos containers
echo "📊 5. Status dos containers:"
docker compose -f docker-compose.prod.yml ps
echo ""

echo "✅ Deploy concluído com sucesso!"
echo ""
echo "🌐 Teste agora:"
echo "   1. Acesse: https://gigflowagenda.com.br/cadastro"
echo "   2. Deve ver formulário em 3 etapas:"
echo "      - Etapa 1: Segurança da Conta"
echo "      - Etapa 2: Informações Pessoais"
echo "      - Etapa 3: Perfil Musical"
echo ""
