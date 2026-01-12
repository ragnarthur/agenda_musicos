#!/bin/bash

# Script de Deploy - Formulário Multi-Step
# Executar no servidor: ssh arthur@srv1252721
# cd /opt/agenda-musicos/agenda_musicos && bash deploy-multistep-form.sh

set -e  # Para em caso de erro

echo "🚀 Iniciando deploy do formulário multi-step..."
echo ""

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

# 4. Aguardar frontend ficar pronto
echo "⏳ 4. Aguardando frontend iniciar..."
sleep 5
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
