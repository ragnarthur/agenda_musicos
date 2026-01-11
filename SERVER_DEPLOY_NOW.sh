#!/bin/bash

# Script para executar NO SERVIDOR após git pull
# Uso: bash SERVER_DEPLOY_NOW.sh

set -e  # Para em caso de erro

echo "🚀 Iniciando deploy da atualização do autocomplete de cidades..."
echo ""

# Diretório do projeto
cd /opt/agenda-musicos/agenda_musicos

echo "📥 1. Fazendo git pull..."
git pull origin main
echo "✅ Git pull concluído"
echo ""

echo "🔨 2. Fazendo rebuild do frontend (TypeScript + Vite)..."
docker compose -f docker-compose.prod.yml build frontend --no-cache
echo "✅ Build do frontend concluído"
echo ""

echo "🔄 3. Reiniciando serviço do frontend..."
docker compose -f docker-compose.prod.yml up -d frontend
echo "✅ Frontend reiniciado"
echo ""

echo "🔍 4. Verificando status dos containers..."
docker compose -f docker-compose.prod.yml ps
echo ""

echo "📊 5. Verificando logs do frontend (últimas 20 linhas)..."
docker compose -f docker-compose.prod.yml logs --tail=20 frontend
echo ""

echo "✅ Deploy concluído com sucesso!"
echo ""
echo "🌐 Acesse: https://gigflowagenda.com.br/register"
echo "   O campo de cidade agora tem autocomplete dinâmico visível!"
echo ""
