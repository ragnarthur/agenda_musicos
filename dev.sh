#!/bin/bash

# Script de desenvolvimento local
# Uso: ./dev.sh [comando]
# Comandos:
#   start    - Inicia o backend Django
#   migrate  - Aplica migrations
#   shell    - Abre Django shell
#   dbshell  - Abre psql
#   test     - Roda testes

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Carregar variáveis de ambiente do .env.local
export DATABASE_URL="postgresql://agenda:agenda@localhost:5433/agenda"
export DEBUG="True"
export SECRET_KEY="dev-secret-key"
export ALLOWED_HOSTS="localhost,127.0.0.1,backend"
export CORS_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
export FRONTEND_URL="http://localhost:5174"
export EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend"
export DEFAULT_FROM_EMAIL="dev@localhost"
export PAYMENT_SERVICE_URL="http://localhost:3002"
export PAYMENT_SERVICE_SECRET="dev-payment-secret"
export USE_STRIPE="False"
export ALLOW_FAKE_PAYMENT="True"
export COOKIE_SECURE="False"

# Comando padrão é start
COMMAND=${1:-start}

case "$COMMAND" in
  start)
    echo -e "${GREEN}🚀 Iniciando servidor Django...${NC}"
    echo -e "${BLUE}📊 PostgreSQL: localhost:5433${NC}"
    echo -e "${BLUE}🌐 Backend: http://localhost:8000${NC}"
    echo ""
    python manage.py runserver
    ;;

  migrate)
    echo -e "${GREEN}🔄 Aplicando migrations...${NC}"
    python manage.py migrate
    echo -e "${GREEN}✅ Migrations aplicadas!${NC}"
    ;;

  shell)
    echo -e "${GREEN}🐚 Abrindo Django shell...${NC}"
    python manage.py shell
    ;;

  dbshell)
    echo -e "${GREEN}🗄️  Conectando ao PostgreSQL...${NC}"
    python manage.py dbshell
    ;;

  test)
    echo -e "${GREEN}🧪 Rodando testes...${NC}"
    python manage.py test
    ;;

  createsuperuser)
    echo -e "${GREEN}👤 Criando superusuário...${NC}"
    python manage.py createsuperuser
    ;;

  *)
    echo -e "${YELLOW}Comandos disponíveis:${NC}"
    echo "  ./dev.sh start           - Inicia o backend Django"
    echo "  ./dev.sh migrate         - Aplica migrations"
    echo "  ./dev.sh shell           - Abre Django shell"
    echo "  ./dev.sh dbshell         - Abre psql"
    echo "  ./dev.sh test            - Roda testes"
    echo "  ./dev.sh createsuperuser - Cria superusuário"
    ;;
esac
