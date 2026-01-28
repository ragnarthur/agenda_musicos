#!/bin/bash

# =============================================================================
# Setup Script - Agenda de Músicos
# =============================================================================
# Configuração automática do servidor
# Configure variáveis de ambiente: PROJECT_DIR, SERVER_IP, SERVER_PORT, INTERNAL_PORT
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/var/www/agenda-musicos}"
SERVER_IP="${SERVER_IP:-127.0.0.1}"
SERVER_PORT="${SERVER_PORT:-2030}"
INTERNAL_PORT="${INTERNAL_PORT:-8005}"
CREDENTIALS_FILE="$PROJECT_DIR/.credentials"

# Generate secure random password
generate_password() {
    openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20
}

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
        python3 \
        python3-venv \
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
    python3 -m venv .venv
    source .venv/bin/activate

    # Install dependencies
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn

    print_step "Ambiente Python configurado ✓"
}

setup_database() {
    print_step "Configurando banco de dados PostgreSQL..."

    # Adicionar lock file para prevenir race conditions
    DB_LOCK="/tmp/pgsql_setup.lock"
    exec 200>"$DB_LOCK"
    flock -n 200 || {
        print_error "Outra instância já está executando setup do banco"
        exit 1
    }

    # Check if database already exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw agenda_musicos; then
        print_warning "Banco de dados 'agenda_musicos' já existe. Pulando criação."
        # Load existing password from credentials file
        if [ -f "$CREDENTIALS_FILE" ]; then
            DB_PASSWORD=$(grep "^DB_PASSWORD=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
        fi
    else
        print_step "Criando banco de dados..."

        # Generate secure random password
        DB_PASSWORD=$(generate_password)

        # Escape password for SQL injection protection
        DB_PASSWORD_ESCAPED=$(printf '%s' "$DB_PASSWORD" | sed "s/'/''/g")

        sudo -u postgres psql <<EOF
CREATE DATABASE agenda_musicos;
CREATE USER agenda_user WITH PASSWORD '$DB_PASSWORD_ESCAPED';
ALTER ROLE agenda_user SET client_encoding TO 'utf8';
ALTER ROLE agenda_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE agenda_user SET timezone TO 'America/Sao_Paulo';
GRANT ALL PRIVILEGES ON DATABASE agenda_musicos TO agenda_user;
EOF

        # Save password to credentials file
        mkdir -p $(dirname "$CREDENTIALS_FILE")
        echo "DB_PASSWORD=$DB_PASSWORD" >> "$CREDENTIALS_FILE"
        chmod 600 "$CREDENTIALS_FILE"

        print_step "Banco de dados criado ✓"
        print_step "Senha do banco salva em: $CREDENTIALS_FILE"
    fi
}

setup_django() {
    print_step "Configurando Django..."

    cd $PROJECT_DIR
    source .venv/bin/activate

    # Create .env.docker if not exists
    if [ ! -f ".env.docker" ]; then
        print_step "Criando arquivo .env.docker..."

        # Load DB password from credentials file
        if [ -f "$CREDENTIALS_FILE" ]; then
            DB_PASSWORD=$(grep "^DB_PASSWORD=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
        else
            print_error "Arquivo de credenciais não encontrado. Execute setup_database primeiro."
            exit 1
        fi

        cat > .env.docker <<EOF
SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,$SERVER_IP
SERVER_IP=$SERVER_IP
SERVER_PORT=$SERVER_PORT
INTERNAL_PORT=$INTERNAL_PORT
DATABASE_URL=postgresql://agenda_user:${DB_PASSWORD}@localhost/agenda_musicos
CORS_ORIGINS=http://$SERVER_IP:$SERVER_PORT
EOF
        chmod 600 .env.docker
    fi

    # Run migrations
    python manage.py migrate

    # Collect static files
    python manage.py collectstatic --noinput

    # Generate admin password if not exists
    if ! grep -q "^ADMIN_PASSWORD=" "$CREDENTIALS_FILE" 2>/dev/null; then
        ADMIN_PASSWORD=$(generate_password)
        echo "ADMIN_PASSWORD=$ADMIN_PASSWORD" >> "$CREDENTIALS_FILE"
    else
        ADMIN_PASSWORD=$(grep "^ADMIN_PASSWORD=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
    fi

    # Create superuser (skip if already exists)
    python manage.py shell <<EOF
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@localhost', '$ADMIN_PASSWORD')
    print('Superuser created successfully')
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

    # Frontend env é fornecido via build args no Docker.
    # Se estiver usando build manual, crie frontend/.env conforme necessário.
    if [ ! -f ".env" ]; then
        print_warning "frontend/.env não criado (build via Docker usa .env.docker)."
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

    # Set permissions - diretórios com 755, arquivos com 644
    find . -type d -exec chmod 755 {} \;
    find . -type f -exec chmod 644 {} \;

    # Arquivos executáveis
    chmod 755 manage.py
    chmod 755 setup.sh
    chmod 755 update.sh 2>/dev/null || true

    # Diretórios que precisam de escrita
    chmod -R 775 staticfiles/ media/ 2>/dev/null || true

    # Proteger arquivos sensíveis
    chmod 600 .env.docker 2>/dev/null || true
    chmod 600 "$CREDENTIALS_FILE" 2>/dev/null || true

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
    echo -e "${YELLOW}IMPORTANTE - Credenciais:${NC}"
    echo "  As senhas foram salvas em: $CREDENTIALS_FILE"
    echo "  Este arquivo contém:"
    echo "    - DB_PASSWORD: Senha do banco PostgreSQL"
    echo "    - ADMIN_PASSWORD: Senha do admin Django"
    echo ""
    echo "  Para visualizar as credenciais:"
    echo "    sudo cat $CREDENTIALS_FILE"
    echo ""
    echo "  Admin Django:"
    echo "    - URL: http://$SERVER_IP:$SERVER_PORT/admin/"
    echo "    - User: admin"
    echo ""
    echo -e "${RED}ATENÇÃO:${NC} Altere as senhas dos músicos de demonstração!"
    echo "  Use: python manage.py changepassword <username>"
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
