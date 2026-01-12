#!/bin/bash

# Script de Deploy - Campo State (UF)
# Executar no servidor: ssh arthur@srv1252721
# cd /opt/agenda-musicos/agenda_musicos && bash deploy-state-field.sh

set -e  # Para em caso de erro

echo "🚀 Iniciando deploy do campo State (UF)..."
echo ""

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

# 5. Aguardar backend ficar pronto
echo "⏳ 5. Aguardando backend iniciar..."
sleep 10
echo ""

# 6. Verificar migrations
echo "🔍 6. Verificando migrations aplicadas..."
docker compose -f docker-compose.prod.yml logs backend | grep "0024_add_state_to_musician"
echo ""

# 7. Verificar status dos containers
echo "📊 7. Status dos containers:"
docker compose -f docker-compose.prod.yml ps
echo ""

echo "✅ Deploy concluído com sucesso!"
echo ""
echo "🌐 Teste agora:"
echo "   1. Acesse: https://gigflowagenda.com.br/register"
echo "   2. Digite 'São Paulo' no campo cidade"
echo "   3. Deve aparecer dropdown com 'São Paulo - SP'"
echo ""
