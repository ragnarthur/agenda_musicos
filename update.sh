  #!/bin/bash
  cd /var/www/agenda-musicos

  echo "🔄 Atualizando código..."
  sudo git pull origin main

  echo "🐍 Atualizando backend..."
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
