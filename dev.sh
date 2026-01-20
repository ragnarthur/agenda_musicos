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

# Carregar variáveis de ambiente do .env.local (fallback: .env.docker)
load_env_file() {
  local env_file="$1"
  if [ ! -f "$env_file" ]; then
    return 1
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    local key="${line%%=*}"
    local value="${line#*=}"
    export "$key=$value"
  done < "$env_file"
}

if ! load_env_file ".env.local"; then
  load_env_file ".env.docker"
fi

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
