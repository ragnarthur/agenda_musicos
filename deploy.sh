#!/bin/bash

# =============================================================================
# Deploy Script - Agenda de Musicos (Docker)
# =============================================================================
# Servidor: Configure DOMAIN e SERVER_IP via variáveis de ambiente
# Dominio: gigflowagenda.com.br
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/var/www/agenda-musicos"
DOMAIN="${DOMAIN:-gigflowagenda.com.br}"
SERVER_IP="${SERVER_IP:-127.0.0.1}"

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}AVISO:${NC} $1"
}

print_error() {
    echo -e "${RED}ERRO:${NC} $1"
}

# =============================================================================
# Funcoes
# =============================================================================

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker nao instalado. Execute: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi

    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose nao instalado."
        exit 1
    fi

    print_step "Docker e Docker Compose instalados"
}

update_code() {
    print_step "Atualizando codigo do repositorio..."
    cd $PROJECT_DIR
    git fetch origin
    git reset --hard origin/main
    print_step "Codigo atualizado"
}

build_and_deploy() {
    print_step "Parando containers existentes..."
    cd $PROJECT_DIR
    docker compose -f docker-compose.prod.yml down || true

    print_step "Construindo e iniciando containers..."
    docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

    print_step "Aguardando containers iniciarem..."
    sleep 15

    print_step "Status dos containers:"
    docker compose -f docker-compose.prod.yml ps
}

check_health() {
    print_step "Verificando saude dos servicos..."

    # Backend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/ | grep -q "200\|401"; then
        echo -e "  Backend: ${GREEN}OK${NC}"
    else
        echo -e "  Backend: ${RED}FALHOU${NC}"
    fi

    # Frontend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:80/ | grep -q "200"; then
        echo -e "  Frontend: ${GREEN}OK${NC}"
    else
        echo -e "  Frontend: ${RED}FALHOU${NC}"
    fi
}

show_logs() {
    print_step "Ultimas linhas dos logs:"
    docker compose -f docker-compose.prod.yml logs --tail=20
}

generate_ssl() {
    print_step "Gerando certificado SSL com Let's Encrypt..."

    # Verificar se DNS esta propagado
    RESOLVED_IP=$(dig +short $DOMAIN)

    if [ -z "$SERVER_IP" ] || [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
        print_warning "DNS ainda nao propagado. $DOMAIN aponta para: $RESOLVED_IP"
        print_warning "Configure SERVER_IP=$RESOLVED_IP se este for o IP correto."
        print_warning "Aguarde a propagacao do DNS antes de gerar o certificado SSL."
        return 1
    fi

    # Parar nginx para liberar porta 80
    docker compose -f docker-compose.prod.yml stop nginx

    # Gerar certificado
    docker compose -f docker-compose.prod.yml run --rm certbot certonly \
        --standalone \
        --email admin@$DOMAIN \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN \
        -d api.$DOMAIN

    # Reiniciar nginx
    docker compose -f docker-compose.prod.yml up -d nginx

    print_step "Certificado SSL gerado com sucesso!"
}

renew_ssl() {
    print_step "Renovando certificado SSL..."
    docker compose -f docker-compose.prod.yml run --rm certbot renew
    docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
    print_step "Certificado renovado!"
}

show_help() {
    echo "Uso: ./deploy.sh [comando]"
    echo ""
    echo "Comandos:"
    echo "  deploy     - Atualiza codigo e reinicia containers (padrao)"
    echo "  build      - Reconstroi todos os containers"
    echo "  logs       - Mostra logs dos containers"
    echo "  status     - Mostra status dos containers"
    echo "  ssl        - Gera certificado SSL (Let's Encrypt)"
    echo "  renew-ssl  - Renova certificado SSL"
    echo "  restart    - Reinicia todos os containers"
    echo "  stop       - Para todos os containers"
    echo "  help       - Mostra esta ajuda"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Agenda de Musicos - Deploy${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    check_docker

    COMMAND=${1:-deploy}

    case $COMMAND in
        deploy)
            update_code
            build_and_deploy
            check_health
            ;;
        build)
            build_and_deploy
            check_health
            ;;
        logs)
            docker compose -f docker-compose.prod.yml logs -f
            ;;
        status)
            docker compose -f docker-compose.prod.yml ps
            check_health
            ;;
        ssl)
            generate_ssl
            ;;
        renew-ssl)
            renew_ssl
            ;;
        restart)
            docker compose -f docker-compose.prod.yml restart
            check_health
            ;;
        stop)
            docker compose -f docker-compose.prod.yml down --remove-orphans
            print_step "Containers parados"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Comando desconhecido: $COMMAND"
            show_help
            exit 1
            ;;
    esac

    echo ""
    echo -e "${GREEN}Concluido!${NC}"
}

# Verificar e mudar para diretório do projeto
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
else
    PROJECT_DIR_FALLBACK="$(dirname "$0")"
    if [ -d "$PROJECT_DIR_FALLBACK" ]; then
        cd "$PROJECT_DIR_FALLBACK"
    else
        print_error "Diretório do projeto não encontrado: $PROJECT_DIR"
        print_error "Certifique-se de estar no diretório correto ou configure PROJECT_DIR"
        exit 1
    fi
fi

main "$@"
