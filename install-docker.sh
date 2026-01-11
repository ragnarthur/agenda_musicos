#!/bin/bash

# Script de instalação do Docker e Docker Compose no servidor Ubuntu
# Uso: bash install-docker.sh

set -e  # Para em caso de erro

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Instalação do Docker + Docker Compose${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Verificar se já está instalado
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker já está instalado:${NC}"
    docker --version

    if docker compose version &> /dev/null; then
        echo -e "${YELLOW}⚠️  Docker Compose Plugin já está instalado:${NC}"
        docker compose version
        echo -e "${GREEN}✅ Tudo já está instalado!${NC}"
        exit 0
    fi
fi

echo -e "${BLUE}📦 Instalando dependências...${NC}"
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

echo -e "${BLUE}🔑 Adicionando chave GPG do Docker...${NC}"
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo -e "${BLUE}📝 Configurando repositório...${NC}"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo -e "${BLUE}📦 Instalando Docker Engine + Docker Compose...${NC}"
sudo apt-get update
sudo apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

echo -e "${BLUE}👤 Adicionando usuário ao grupo docker...${NC}"
sudo usermod -aG docker $USER

echo -e "${BLUE}🚀 Iniciando Docker...${NC}"
sudo systemctl start docker
sudo systemctl enable docker

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✅ Instalação concluída com sucesso!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}Versões instaladas:${NC}"
docker --version
docker compose version
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo -e "${YELLOW}Para usar docker sem sudo, faça logout e login novamente.${NC}"
echo ""
echo -e "${GREEN}Próximos passos:${NC}"
echo "1. Fazer logout/login: ${BLUE}exit${NC} (depois logar novamente)"
echo "2. Testar: ${BLUE}docker ps${NC}"
echo "3. Deploy: ${BLUE}cd /opt/agenda-musicos/agenda_musicos && docker compose -f docker-compose.prod.yml up -d${NC}"
echo ""
