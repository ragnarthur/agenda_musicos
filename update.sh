#!/bin/bash

# =============================================================================
# Update Script - Agenda de Músicos
# =============================================================================
# Script para atualizar a aplicação no servidor
# Executa pull do git, instala dependências, migra DB e reinicia serviços
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/agenda-musicos"

# =============================================================================
# Helper Functions
# =============================================================================

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Este script deve ser executado como root (sudo)"
        exit 1
    fi
}

# =============================================================================
# Update Steps
# =============================================================================

update_code() {
    print_step "Atualizando código do repositório..."
    cd $PROJECT_DIR
    git pull origin main
    print_step "Código atualizado ✓"
}

update_backend() {
    print_step "Atualizando backend..."
    cd $PROJECT_DIR
    source .venv/bin/activate

    # Install/update dependencies
    pip install -r requirements.txt

    # Run migrations
    python manage.py migrate

    # Collect static files
    python manage.py collectstatic --noinput

    print_step "Backend atualizado ✓"
}

update_frontend() {
    print_step "Atualizando frontend..."
    cd $PROJECT_DIR/frontend

    # Install/update dependencies
    npm install

    # Build for production
    npm run build

    print_step "Frontend atualizado ✓"
}

restart_services() {
    print_step "Reiniciando serviços..."

    # Restart backend (via supervisor)
    supervisorctl restart agenda-musicos

    # Restart nginx (optional, usually not needed)
    # systemctl restart nginx

    print_step "Serviços reiniciados ✓"
}

check_status() {
    print_step "Verificando status dos serviços..."

    echo ""
    echo "Status do Backend:"
    supervisorctl status agenda-musicos

    echo ""
    echo "Status do Nginx:"
    systemctl status nginx --no-pager | head -10

    echo ""
}

# =============================================================================
# Main Update Flow
# =============================================================================

main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Agenda de Músicos - Update${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    read -p "Continuar com a atualização? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi

    check_root

    update_code
    update_backend
    update_frontend
    restart_services
    check_status

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Atualização Concluída!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "O sistema foi atualizado com sucesso."
    echo ""
    echo "Verificar logs:"
    echo "  sudo supervisorctl tail -f agenda-musicos"
    echo ""
}

# Run main update
main
