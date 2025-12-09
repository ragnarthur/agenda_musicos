#!/bin/bash

# =============================================================================
# Setup Script - Agenda de Músicos
# =============================================================================
# Configuração automática do servidor
# IP: 192.168.1.11
# Porta Externa: 2029
# Porta Interna: 8005
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/agenda-musicos"
SERVER_IP="192.168.1.11"
SERVER_PORT="2029"
INTERNAL_PORT="8005"

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
# Installation Steps
# =============================================================================

install_dependencies() {
    print_step "Instalando dependências do sistema..."

    apt update
    apt install -y \
        python3.11 \
        python3.11-venv \
        python3-pip \
        nginx \
        supervisor \
        postgresql \
        postgresql-contrib \
        git \
        curl

    # Install Node.js 18
    if ! command -v node &> /dev/null; then
        print_step "Instalando Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt install -y nodejs
    fi

    print_step "Dependências instaladas ✓"
}

setup_project_directory() {
    print_step "Configurando diretório do projeto..."

    # Ensure we're in the project directory
    if [ ! -f "manage.py" ]; then
        print_error "Este script deve ser executado no diretório raiz do projeto"
        exit 1
    fi

    # Copy to /var/www if not already there
    if [ "$PWD" != "$PROJECT_DIR" ]; then
        print_step "Copiando projeto para $PROJECT_DIR..."
        mkdir -p /var/www
        rsync -av --exclude='.venv' --exclude='node_modules' --exclude='db.sqlite3' . $PROJECT_DIR/
        cd $PROJECT_DIR
    fi

    print_step "Diretório do projeto configurado ✓"
}

setup_python_env() {
    print_step "Configurando ambiente Python..."

    cd $PROJECT_DIR

    # Create virtual environment
    python3.11 -m venv .venv
    source .venv/bin/activate

    # Install dependencies
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn

    print_step "Ambiente Python configurado ✓"
}

setup_database() {
    print_step "Configurando banco de dados PostgreSQL..."

    # Check if database already exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw agenda_musicos; then
        print_warning "Banco de dados 'agenda_musicos' já existe. Pulando criação."
    else
        print_step "Criando banco de dados..."

        sudo -u postgres psql <<EOF
CREATE DATABASE agenda_musicos;
CREATE USER agenda_user WITH PASSWORD 'agenda_password_2024';
ALTER ROLE agenda_user SET client_encoding TO 'utf8';
ALTER ROLE agenda_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE agenda_user SET timezone TO 'America/Sao_Paulo';
GRANT ALL PRIVILEGES ON DATABASE agenda_musicos TO agenda_user;
EOF
        print_step "Banco de dados criado ✓"
    fi
}

setup_django() {
    print_step "Configurando Django..."

    cd $PROJECT_DIR
    source .venv/bin/activate

    # Create .env if not exists
    if [ ! -f ".env" ]; then
        print_step "Criando arquivo .env..."
        cat > .env <<EOF
SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,$SERVER_IP
SERVER_IP=$SERVER_IP
SERVER_PORT=$SERVER_PORT
INTERNAL_PORT=$INTERNAL_PORT
DATABASE_URL=postgresql://agenda_user:agenda_password_2024@localhost/agenda_musicos
CORS_ORIGINS=http://$SERVER_IP:$SERVER_PORT
EOF
    fi

    # Run migrations
    python manage.py migrate

    # Collect static files
    python manage.py collectstatic --noinput

    # Create superuser (skip if already exists)
    python manage.py shell <<EOF
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@localhost', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
EOF

    # Populate database with musicians
    python manage.py populate_db || true

    print_step "Django configurado ✓"
}

setup_frontend() {
    print_step "Configurando frontend..."

    cd $PROJECT_DIR/frontend

    # Create .env if not exists
    if [ ! -f ".env" ]; then
        print_step "Criando .env do frontend..."
        cat > .env <<EOF
VITE_API_URL=http://$SERVER_IP:$SERVER_PORT/api
EOF
    fi

    # Install dependencies and build
    npm install
    npm run build

    print_step "Frontend configurado ✓"
}

setup_nginx() {
    print_step "Configurando Nginx..."

    # Copy nginx config
    cp $PROJECT_DIR/nginx.conf /etc/nginx/sites-available/agenda-musicos

    # Create symlink if not exists
    if [ ! -f "/etc/nginx/sites-enabled/agenda-musicos" ]; then
        ln -s /etc/nginx/sites-available/agenda-musicos /etc/nginx/sites-enabled/
    fi

    # Remove default site if exists
    rm -f /etc/nginx/sites-enabled/default

    # Test nginx config
    nginx -t

    # Restart nginx
    systemctl restart nginx
    systemctl enable nginx

    print_step "Nginx configurado ✓"
}

setup_supervisor() {
    print_step "Configurando Supervisor..."

    # Create log directory
    mkdir -p /var/log/agenda-musicos
    chown www-data:www-data /var/log/agenda-musicos

    # Copy supervisor config
    cp $PROJECT_DIR/supervisor.conf /etc/supervisor/conf.d/agenda-musicos.conf

    # Reload supervisor
    supervisorctl reread
    supervisorctl update
    supervisorctl restart agenda-musicos

    print_step "Supervisor configurado ✓"
}

setup_permissions() {
    print_step "Configurando permissões..."

    cd $PROJECT_DIR

    # Set ownership
    chown -R www-data:www-data .

    # Set permissions
    chmod -R 755 .
    chmod -R 775 staticfiles/ media/ || true

    print_step "Permissões configuradas ✓"
}

setup_firewall() {
    print_step "Configurando firewall..."

    # Allow port 2029
    ufw allow $SERVER_PORT/tcp
    ufw allow OpenSSH

    # Enable firewall (ask user)
    read -p "Ativar firewall? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ufw --force enable
        print_step "Firewall ativado ✓"
    else
        print_warning "Firewall não ativado. Execute 'sudo ufw enable' manualmente."
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Instalação Concluída!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Servidor: ${YELLOW}http://$SERVER_IP:$SERVER_PORT${NC}"
    echo ""
    echo "Credenciais:"
    echo "  Admin Django:"
    echo "    - URL: http://$SERVER_IP:$SERVER_PORT/admin/"
    echo "    - User: admin"
    echo "    - Pass: admin123"
    echo ""
    echo "  Músicos (login no app):"
    echo "    - sara / senha123 (Vocalista)"
    echo "    - arthur / senha123 (Vocalista)"
    echo "    - roberto / senha123 (Baterista e Líder)"
    echo ""
    echo "Comandos úteis:"
    echo "  - Ver logs: sudo supervisorctl tail -f agenda-musicos"
    echo "  - Reiniciar: sudo supervisorctl restart agenda-musicos"
    echo "  - Status: sudo supervisorctl status"
    echo "  - Nginx: sudo systemctl status nginx"
    echo ""
    echo -e "${GREEN}Acesse: http://$SERVER_IP:$SERVER_PORT${NC}"
    echo ""
}

# =============================================================================
# Main Installation Flow
# =============================================================================

main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Agenda de Músicos - Setup${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Configuração do Servidor:"
    echo "  - IP: $SERVER_IP"
    echo "  - Porta Externa: $SERVER_PORT"
    echo "  - Porta Interna: $INTERNAL_PORT"
    echo ""

    read -p "Continuar com a instalação? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi

    check_root

    install_dependencies
    setup_project_directory
    setup_python_env
    setup_database
    setup_django
    setup_frontend
    setup_nginx
    setup_supervisor
    setup_permissions
    setup_firewall

    print_summary
}

# Run main installation
main
