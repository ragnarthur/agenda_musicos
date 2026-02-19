#!/bin/bash

# =============================================================================
# Deploy Script - Agenda de Musicos (Docker)
# =============================================================================
# Servidor: Configure DOMAIN e SERVER_IP via variaveis de ambiente
# Dominio: gigflowagenda.com.br
# =============================================================================

set -euo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/opt/agenda-musicos/agenda_musicos"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
DOMAIN="${DOMAIN:-gigflowagenda.com.br}"
SERVER_IP="${SERVER_IP:-127.0.0.1}"

# Timeouts (segundos) - ajustaveis por variavel de ambiente
GIT_FETCH_TIMEOUT_SECONDS="${GIT_FETCH_TIMEOUT_SECONDS:-120}"
GIT_RESET_TIMEOUT_SECONDS="${GIT_RESET_TIMEOUT_SECONDS:-60}"
DOCKER_DOWN_TIMEOUT_SECONDS="${DOCKER_DOWN_TIMEOUT_SECONDS:-120}"
DOCKER_BUILD_TIMEOUT_SECONDS="${DOCKER_BUILD_TIMEOUT_SECONDS:-1200}"
DOCKER_UP_TIMEOUT_SECONDS="${DOCKER_UP_TIMEOUT_SECONDS:-900}"
DOCKER_RESTART_TIMEOUT_SECONDS="${DOCKER_RESTART_TIMEOUT_SECONDS:-90}"
DOCKER_STATUS_TIMEOUT_SECONDS="${DOCKER_STATUS_TIMEOUT_SECONDS:-60}"
CERTBOT_TIMEOUT_SECONDS="${CERTBOT_TIMEOUT_SECONDS:-600}"
READY_WAIT_TIMEOUT_SECONDS="${READY_WAIT_TIMEOUT_SECONDS:-120}"
READY_WAIT_INTERVAL_SECONDS="${READY_WAIT_INTERVAL_SECONDS:-3}"
DB_TASKS_TIMEOUT_SECONDS="${DB_TASKS_TIMEOUT_SECONDS:-900}"

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}AVISO:${NC} $1"
}

print_error() {
    echo -e "${RED}ERRO:${NC} $1"
}

dc() {
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

run_with_timeout() {
    local timeout_seconds="$1"
    local description="$2"
    shift 2

    if command -v timeout >/dev/null 2>&1; then
        print_step "${description} (timeout: ${timeout_seconds}s)"
        if timeout --foreground "${timeout_seconds}" "$@"; then
            return 0
        fi
        local status=$?
        if [ "$status" -eq 124 ]; then
            print_error "Timeout apos ${timeout_seconds}s em: ${description}"
        elif [ "$status" -ne 0 ]; then
            print_error "Falha (${status}) em: ${description}"
        fi
        return "$status"
    fi

    print_warning "Comando 'timeout' indisponivel; executando sem limite: ${description}"
    if "$@"; then
        return 0
    fi
    local status=$?
    print_error "Falha (${status}) em: ${description}"
    return "$status"
}

collect_diagnostics() {
    print_warning "Coletando diagnostico da stack..."
    cd "$PROJECT_DIR" || return 0
    dc ps || true
    dc logs --tail=100 backend frontend nginx || true
}

# =============================================================================
# Funcoes
# =============================================================================

check_docker() {
    if ! command -v docker &>/dev/null; then
        print_error "Docker nao instalado. Execute: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi

    if ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose nao instalado."
        exit 1
    fi

    print_step "Docker e Docker Compose instalados"
}

update_code() {
    print_step "Atualizando codigo do repositorio..."
    cd "$PROJECT_DIR"

    local before_rev after_rev
    before_rev=$(git rev-parse HEAD 2>/dev/null || true)

    run_with_timeout "$GIT_FETCH_TIMEOUT_SECONDS" "Atualizando refs remotas (git fetch)" git fetch origin
    run_with_timeout "$GIT_RESET_TIMEOUT_SECONDS" "Sincronizando com origin/main (git reset)" git reset --hard origin/main

    after_rev=$(git rev-parse HEAD 2>/dev/null || true)
    print_step "Codigo atualizado"

    # Este script atualiza o proprio arquivo via git reset --hard. Quando isso acontece,
    # as funcoes carregadas na memoria continuam antigas. Reexecuta para aplicar versao nova.
    if [ -z "${DEPLOY_REEXEC:-}" ] && [ -n "$before_rev" ] && [ -n "$after_rev" ] && [ "$before_rev" != "$after_rev" ]; then
        print_step "Reiniciando deploy com a versao atualizada do script..."
        export DEPLOY_REEXEC=1
        exec "$PROJECT_DIR/deploy.sh" "$@"
    fi
}

build_and_deploy() {
    cd "$PROJECT_DIR"

    # Evita janela longa de indisponibilidade: builda imagens com a stack antiga no ar
    # e depois aplica o update em rolling-recreate do Compose.
    run_with_timeout "$DOCKER_BUILD_TIMEOUT_SECONDS" "docker compose build backend frontend" \
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build backend frontend

    run_database_tasks

    run_with_timeout "$DOCKER_UP_TIMEOUT_SECONDS" "docker compose up -d --remove-orphans" \
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

    # Nginx nem sempre precisa restart, mas quando necessario esse passo garante upstream atualizado.
    if ! run_with_timeout "$DOCKER_RESTART_TIMEOUT_SECONDS" "docker compose restart nginx" \
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart nginx; then
        print_warning "Falha ao reiniciar nginx (seguindo, checagem de saude vai validar)."
    fi

    wait_for_readiness || print_warning "Backend ainda inicializando; as validacoes externas continuam no pipeline."

    print_step "Status dos containers:"
    run_with_timeout "$DOCKER_STATUS_TIMEOUT_SECONDS" "docker compose ps" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
}

run_database_tasks() {
    cd "$PROJECT_DIR"

    run_with_timeout "$DOCKER_UP_TIMEOUT_SECONDS" "docker compose up -d db pgbouncer redis" \
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d db pgbouncer redis

    run_with_timeout "$DB_TASKS_TIMEOUT_SECONDS" "Executando migrations e collectstatic" \
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm backend sh -c "
python - <<'PY'
import socket
import time
import sys

host = 'pgbouncer'
port = 5432
for attempt in range(60):
    try:
        with socket.create_connection((host, port), timeout=2):
            print('PgBouncer pronto')
            break
    except OSError:
        print(f'Aguardando PgBouncer ({attempt + 1}/60)...')
        time.sleep(2)
else:
    sys.exit('PgBouncer nao ficou pronto a tempo')
PY
python manage.py migrate --noinput
python manage.py collectstatic --noinput
"
}

wait_for_readiness() {
    print_step "Aguardando backend ficar pronto (/api/readyz)..."

    local max_attempts
    max_attempts=$((READY_WAIT_TIMEOUT_SECONDS / READY_WAIT_INTERVAL_SECONDS))
    if [ "$max_attempts" -lt 1 ]; then
        max_attempts=1
    fi

    local attempt code
    for attempt in $(seq 1 "$max_attempts"); do
        code=$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 2 --max-time 5 \
            --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/api/readyz/" || echo "000")

        if [ "$code" = "200" ]; then
            print_step "Backend pronto (readyz=200)."
            return 0
        fi

        echo "  Tentativa ${attempt}/${max_attempts}: readyz=${code}"
        sleep "$READY_WAIT_INTERVAL_SECONDS"
    done

    return 1
}

check_health() {
    print_step "Verificando saude dos servicos..."

    # Importante:
    # - O backend nao expoe 8000 no host (apenas na rede interna do Docker).
    # - O nginx pode responder 444 em :80 quando o Host nao bate (default_server).
    # Para evitar falso-negativos, validamos via HTTPS do nginx com SNI/Host corretos.

    local curl_opts
    curl_opts=(-sS -o /dev/null --connect-timeout 2 --max-time 5)

    local resolve_opt=()
    if command -v curl >/dev/null 2>&1; then
        resolve_opt=(--resolve "${DOMAIN}:443:127.0.0.1")
    fi

    local frontend_code backend_code
    frontend_code=$(curl "${curl_opts[@]}" "${resolve_opt[@]}" -w "%{http_code}" "https://${DOMAIN}/" || echo "000")
    backend_code=$(curl "${curl_opts[@]}" "${resolve_opt[@]}" -w "%{http_code}" "https://${DOMAIN}/api/" || echo "000")

    if echo "$frontend_code" | grep -qE '^200$'; then
        echo -e "  Frontend: ${GREEN}OK${NC} (${frontend_code})"
    elif echo "$frontend_code" | grep -qE '^(000|502|503)$'; then
        echo -e "  Frontend: ${YELLOW}INICIANDO${NC} (${frontend_code})"
    else
        echo -e "  Frontend: ${RED}FALHOU${NC} (${frontend_code})"
    fi

    # /api/ normalmente retorna 200 ou 401 dependendo de auth
    if echo "$backend_code" | grep -qE '^(200|401)$'; then
        echo -e "  Backend: ${GREEN}OK${NC} (${backend_code})"
    elif echo "$backend_code" | grep -qE '^(000|502|503)$'; then
        echo -e "  Backend: ${YELLOW}INICIANDO${NC} (${backend_code})"
    else
        echo -e "  Backend: ${RED}FALHOU${NC} (${backend_code})"
    fi
}

show_logs() {
    print_step "Ultimas linhas dos logs:"
    run_with_timeout "$DOCKER_STATUS_TIMEOUT_SECONDS" "docker compose logs --tail=20" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=20
}

generate_ssl() {
    print_step "Gerando certificado SSL com Let's Encrypt..."

    # Verificar se DNS esta propagado
    RESOLVED_IP=$(dig +short "$DOMAIN")

    if [ -z "$SERVER_IP" ] || [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
        print_warning "DNS ainda nao propagado. $DOMAIN aponta para: $RESOLVED_IP"
        print_warning "Configure SERVER_IP=$RESOLVED_IP se este for o IP correto."
        print_warning "Aguarde a propagacao do DNS antes de gerar o certificado SSL."
        return 1
    fi

    run_with_timeout "$DOCKER_RESTART_TIMEOUT_SECONDS" "Parando nginx para liberar porta 80" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop nginx

    run_with_timeout "$CERTBOT_TIMEOUT_SECONDS" "Gerando certificado SSL" \
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm certbot certonly \
        --standalone \
        --email "admin@$DOMAIN" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        -d "api.$DOMAIN"

    run_with_timeout "$DOCKER_RESTART_TIMEOUT_SECONDS" "Subindo nginx" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d nginx

    print_step "Certificado SSL gerado com sucesso!"
}

renew_ssl() {
    print_step "Renovando certificado SSL..."
    run_with_timeout "$CERTBOT_TIMEOUT_SECONDS" "Certbot renew" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm certbot renew
    run_with_timeout "$DOCKER_RESTART_TIMEOUT_SECONDS" "Recarregando nginx" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec nginx nginx -s reload
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

run_deploy() {
    local command="$1"
    trap 'collect_diagnostics' ERR
    update_code "$command"
    build_and_deploy
    check_health
    trap - ERR
}

run_build() {
    trap 'collect_diagnostics' ERR
    build_and_deploy
    check_health
    trap - ERR
}

run_restart() {
    trap 'collect_diagnostics' ERR
    cd "$PROJECT_DIR"
    run_with_timeout "$DOCKER_RESTART_TIMEOUT_SECONDS" "docker compose restart" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart
    check_health
    trap - ERR
}

run_stop() {
    trap 'collect_diagnostics' ERR
    cd "$PROJECT_DIR"
    run_with_timeout "$DOCKER_DOWN_TIMEOUT_SECONDS" "docker compose down --remove-orphans" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down --remove-orphans
    print_step "Containers parados"
    trap - ERR
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

    case "$COMMAND" in
        deploy)
            run_deploy "$COMMAND"
            ;;
        build)
            run_build
            ;;
        logs)
            cd "$PROJECT_DIR"
            dc logs -f
            ;;
        status)
            cd "$PROJECT_DIR"
            run_with_timeout "$DOCKER_STATUS_TIMEOUT_SECONDS" "docker compose ps" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
            check_health
            ;;
        ssl)
            generate_ssl
            ;;
        renew-ssl)
            renew_ssl
            ;;
        restart)
            run_restart
            ;;
        stop)
            run_stop
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

# Verificar e mudar para diretorio do projeto
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
else
    PROJECT_DIR_FALLBACK="$(dirname "$0")"
    if [ -d "$PROJECT_DIR_FALLBACK" ]; then
        cd "$PROJECT_DIR_FALLBACK"
    else
        print_error "Diretorio do projeto nao encontrado: $PROJECT_DIR"
        print_error "Certifique-se de estar no diretorio correto ou configure PROJECT_DIR"
        exit 1
    fi
fi

main "$@"
