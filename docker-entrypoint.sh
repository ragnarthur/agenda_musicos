#!/bin/bash
set -e

echo "🔧 Docker Entrypoint: Verificando permissões de diretórios..."

# Garantir que o diretório media existe
if [ -d "/app/media" ]; then
    echo "✓ Diretório /app/media encontrado"

    # Verificar se precisamos corrigir permissões
    if [ "$(stat -c '%U' /app/media 2>/dev/null)" != "appuser" ]; then
        echo "⚠️  Diretório /app/media pertence a $(stat -c '%U' /app/media 2>/dev/null), corrigindo..."

        # Corrigir permissões do diretório media e subdiretórios
        chown -R appuser:appuser /app/media/
        echo "✓ Permissões de /app/media corrigidas para appuser:appuser"
    else
        echo "✓ Permissões de /app/media corretas"
    fi

    # Garantir permissões de escrita para diretórios específicos
    for dir in avatars covers org_logos; do
        if [ -d "/app/media/$dir" ]; then
            chmod 755 "/app/media/$dir"
            echo "✓ Permissões de /app/media/$dir configuradas (755)"
        else
            echo "⚠️  Criando diretório /app/media/$dir"
            mkdir -p "/app/media/$dir"
            chown appuser:appuser "/app/media/$dir"
            chmod 755 "/app/media/$dir"
        fi
    done
else
    echo "⚠️  Diretório /app/media não encontrado, criando..."
    mkdir -p /app/media/{avatars,covers,org_logos}
    chown -R appuser:appuser /app/media/
    chmod -R 755 /app/media/
fi

# Verificar diretórios estáticos
if [ -d "/app/staticfiles" ]; then
    chown -R appuser:appuser /app/staticfiles/
    echo "✓ Permissões de /app/staticfiles corrigidas"
fi

echo "🚀 Iniciando aplicativo..."

# Executar o comando passado como argumento (ou o padrão)
if [ "$1" = "gunicorn" ]; then
    exec gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers 3 \
        --threads 2 \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -
else
    exec "$@"
fi