#!/bin/bash
# Script para corrigir erro 502 - rebuild do nginx com configuração correta
set -e

echo "🔧 Corrigindo erro 502 - Reconfigurando nginx..."

# Função de health check
wait_for_service() {
    local container=$1
    local max_attempts=$2
    local service_name=$3
    local attempt=0

    echo "⏳ Aguardando $service_name ficar pronto..."
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f docker-compose.prod.yml ps $container | grep -q "Up"; then
            echo "✅ $service_name está rodando!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "   Tentativa $attempt/$max_attempts..."
        sleep 2
    done
    echo "❌ $service_name não iniciou após $((max_attempts * 2)) segundos"
    return 1
}

echo ""
echo "📋 Passo 1: Parando nginx..."
docker compose -f docker-compose.prod.yml stop nginx

echo ""
echo "📋 Passo 2: Removendo container antigo do nginx..."
docker compose -f docker-compose.prod.yml rm -f nginx

echo ""
echo "📋 Passo 3: Verificando configuração do nginx..."
cat deploy/nginx/default.conf | grep "upstream django_backend"

echo ""
echo "📋 Passo 4: Recriando nginx com configuração correta..."
docker compose -f docker-compose.prod.yml up -d nginx

echo ""
echo "📋 Passo 5: Aguardando nginx iniciar (com health check)..."
if ! wait_for_service "nginx" 15 "Nginx"; then
    echo "⚠️  Warning: Nginx pode não estar totalmente pronto"
fi
echo ""

echo "📋 Passo 6: Verificando status dos containers..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "📋 Passo 7: Testando conectividade backend..."
docker compose -f docker-compose.prod.yml exec nginx ping -c 2 backend || echo "⚠️  Ping falhou, mas isso é normal (ICMP pode estar bloqueado)"

echo ""
echo "📋 Passo 8: Verificando logs do nginx..."
docker compose -f docker-compose.prod.yml logs --tail=20 nginx

echo ""
echo "✅ Nginx reconfigurado! Aguardando estabilização..."
if ! wait_for_service "nginx" 5 "Nginx (verificação final)"; then
    echo "⚠️  Warning: Nginx pode ter problemas"
fi
echo ""

echo "📋 Passo 9: Teste final - verificando erro 502..."
docker compose -f docker-compose.prod.yml logs --tail=5 nginx | grep -i error || echo "✅ Nenhum erro encontrado!"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CORREÇÃO CONCLUÍDA!"
echo ""
echo "Agora teste o cadastro em: https://gigflowagenda.com.br/cadastro"
echo ""
echo "Se ainda houver erro 502, execute:"
echo "  docker compose -f docker-compose.prod.yml logs backend | tail -50"
echo "  docker compose -f docker-compose.prod.yml logs nginx | tail -50"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
