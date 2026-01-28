  #!/bin/bash

# Verificar se está no diretório correto
if [ ! -f "manage.py" ]; then
    echo "❌ Erro: Este script deve ser executado no diretório raiz do projeto"
    echo "   (deve conter o arquivo manage.py)"
    exit 1
fi

cd /var/www/agenda-musicos

echo "🔄 Atualizando código..."
sudo git pull origin main

echo "🐍 Atualizando backend..."

# Verificar se virtual environment existe
if [ ! -d ".venv" ]; then
    echo "❌ Erro: Virtual environment (.venv) não encontrado"
    echo "   Execute: python3 -m venv .venv && source .venv/bin/activate"
    exit 1
fi

source .venv/bin/activate
  pip install -r requirements.txt
  python manage.py migrate
  python manage.py collectstatic --noinput

  echo "⚛️ Atualizando frontend..."
  cd frontend
  npm install
  npm run build
  cd ..

  echo "🔄 Reiniciando serviços..."
  sudo supervisorctl restart agenda-musicos
  sudo systemctl restart nginx

  echo "✅ Atualização concluída!"
  sudo supervisorctl status
