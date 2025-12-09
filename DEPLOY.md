# 🚀 Guia de Deploy - Agenda de Músicos

Este guia fornece instruções completas para deploy do sistema em servidor de testes/produção.

## 📋 Pré-requisitos

### Servidor
- Ubuntu 20.04+ ou similar
- Python 3.11+
- Node.js 18+ e npm
- Nginx (recomendado)
- PostgreSQL 14+ (recomendado para produção)
- Supervisor ou systemd (para manter processos rodando)

### Domínio e SSL
- Domínio configurado apontando para o servidor
- Certificado SSL (Let's Encrypt com Certbot)

---

## 🔧 Configuração do Servidor

### 1. Atualizar Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Dependências
```bash
# Python e dependências
sudo apt install -y python3.11 python3.11-venv python3-pip

# Node.js e npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# Supervisor
sudo apt install -y supervisor

# Git
sudo apt install -y git
```

---

## 📦 Deploy do Backend (Django)

### 1. Clonar Repositório
```bash
cd /var/www
sudo git clone <seu-repositorio-git> agenda-musicos
sudo chown -R $USER:$USER agenda-musicos
cd agenda-musicos
```

### 2. Configurar Ambiente Virtual
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configurar Banco de Dados PostgreSQL
```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar banco e usuário
CREATE DATABASE agenda_musicos;
CREATE USER agenda_user WITH PASSWORD 'senha_segura_aqui';
ALTER ROLE agenda_user SET client_encoding TO 'utf8';
ALTER ROLE agenda_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE agenda_user SET timezone TO 'America/Sao_Paulo';
GRANT ALL PRIVILEGES ON DATABASE agenda_musicos TO agenda_user;
\q
```

### 4. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar arquivo .env
nano .env
```

**Configuração para produção (.env):**
```env
# Django Settings
SECRET_KEY=gere-uma-chave-secreta-forte-aqui-use-python-get_random_secret_key
DEBUG=False
ALLOWED_HOSTS=seudominio.com,www.seudominio.com,seu-ip-servidor

# Database
DATABASE_URL=postgresql://agenda_user:senha_segura_aqui@localhost/agenda_musicos

# CORS (Frontend URLs)
CORS_ORIGINS=https://seudominio.com,https://www.seudominio.com
```

**Gerar SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 5. Executar Migrações e Coletar Static Files
```bash
# Ativar ambiente virtual
source .venv/bin/activate

# Migrar banco de dados
python manage.py migrate

# Criar superusuário
python manage.py createsuperuser

# Popular banco com músicos (opcional)
python manage.py populate_db

# Coletar arquivos estáticos
python manage.py collectstatic --noinput
```

### 6. Testar Backend
```bash
# Teste local (não deixe rodando em produção assim)
python manage.py runserver 0.0.0.0:8000
```

### 7. Configurar Gunicorn
```bash
# Instalar gunicorn
pip install gunicorn

# Testar gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

### 8. Configurar Supervisor (manter processo rodando)
```bash
sudo nano /etc/supervisor/conf.d/agenda-musicos.conf
```

**Conteúdo do arquivo:**
```ini
[program:agenda-musicos]
command=/var/www/agenda-musicos/.venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 120
directory=/var/www/agenda-musicos
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/agenda-musicos/err.log
stdout_logfile=/var/log/agenda-musicos/out.log
```

```bash
# Criar diretório de logs
sudo mkdir -p /var/log/agenda-musicos
sudo chown www-data:www-data /var/log/agenda-musicos

# Recarregar supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start agenda-musicos
sudo supervisorctl status
```

---

## 🎨 Deploy do Frontend (React)

### 1. Instalar Dependências
```bash
cd /var/www/agenda-musicos/frontend
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
nano .env
```

**Produção (.env):**
```env
VITE_API_URL=https://api.seudominio.com/api
```

### 3. Build para Produção
```bash
npm run build
```

Isso gera a pasta `dist/` com os arquivos otimizados.

---

## 🌐 Configurar Nginx

### 1. Criar Configuração do Site
```bash
sudo nano /etc/nginx/sites-available/agenda-musicos
```

**Conteúdo:**
```nginx
# Servidor Backend (API)
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/agenda-musicos/staticfiles/;
    }

    location /media/ {
        alias /var/www/agenda-musicos/media/;
    }
}

# Servidor Frontend
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    root /var/www/agenda-musicos/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compressão
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Cache para assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Ativar Site
```bash
sudo ln -s /etc/nginx/sites-available/agenda-musicos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Configurar SSL com Let's Encrypt
```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificados (vai editar o nginx automaticamente)
sudo certbot --nginx -d seudominio.com -d www.seudominio.com -d api.seudominio.com

# Renovação automática (já configurado pelo certbot)
sudo certbot renew --dry-run
```

---

## 🔒 Segurança

### 1. Firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

### 2. Configurar Permissões
```bash
cd /var/www/agenda-musicos
sudo chown -R www-data:www-data .
sudo chmod -R 755 .
```

### 3. Settings de Segurança Django
No arquivo `config/settings.py`, certifique-se:
- `DEBUG = False`
- `ALLOWED_HOSTS` configurado
- `SECURE_SSL_REDIRECT = True` (com HTTPS)
- `CSRF_COOKIE_SECURE = True`
- `SESSION_COOKIE_SECURE = True`

---

## 📊 Monitoramento

### 1. Verificar Logs
```bash
# Logs do Django
sudo tail -f /var/log/agenda-musicos/out.log
sudo tail -f /var/log/agenda-musicos/err.log

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Status do Supervisor
sudo supervisorctl status
```

### 2. Comandos Úteis
```bash
# Reiniciar backend
sudo supervisorctl restart agenda-musicos

# Reiniciar nginx
sudo systemctl restart nginx

# Ver processos
sudo supervisorctl status
```

---

## 🔄 Atualizar Aplicação

### Backend
```bash
cd /var/www/agenda-musicos
git pull origin main
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo supervisorctl restart agenda-musicos
```

### Frontend
```bash
cd /var/www/agenda-musicos/frontend
git pull origin main
npm install
npm run build
```

---

## 🧪 Testes Finais

### 1. Verificar Backend
```bash
curl https://api.seudominio.com/api/
```

### 2. Verificar Frontend
Acesse: https://seudominio.com

### 3. Testar Login
- Login com credenciais criadas
- Criar evento
- Testar todas as funcionalidades

### 4. Verificar SSL
https://www.ssllabs.com/ssltest/analyze.html?d=seudominio.com

---

## 📝 Checklist de Deploy

- [ ] Servidor atualizado
- [ ] PostgreSQL instalado e configurado
- [ ] Banco de dados criado
- [ ] Migrações executadas
- [ ] Músicos populados no banco
- [ ] `.env` configurado corretamente (SECRET_KEY, DEBUG=False)
- [ ] Arquivos estáticos coletados
- [ ] Gunicorn rodando via Supervisor
- [ ] Nginx configurado e rodando
- [ ] SSL configurado com Let's Encrypt
- [ ] Frontend buildado e servido
- [ ] CORS configurado corretamente
- [ ] Firewall configurado
- [ ] Testes de login funcionando
- [ ] Testes de criação de eventos funcionando
- [ ] Logs funcionando e acessíveis

---

## 🆘 Troubleshooting

### Backend não inicia
```bash
# Ver logs
sudo supervisorctl tail -f agenda-musicos stderr

# Verificar permissões
ls -la /var/www/agenda-musicos

# Testar manualmente
cd /var/www/agenda-musicos
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

### Frontend não carrega
```bash
# Verificar build
ls -la /var/www/agenda-musicos/frontend/dist

# Ver logs do nginx
sudo tail -f /var/log/nginx/error.log

# Verificar permissões
sudo chown -R www-data:www-data /var/www/agenda-musicos/frontend/dist
```

### CORS Error
- Verificar `CORS_ORIGINS` no `.env` do backend
- Verificar `VITE_API_URL` no `.env` do frontend
- Reiniciar backend após mudanças

### 502 Bad Gateway
- Backend não está rodando: `sudo supervisorctl status`
- Reiniciar: `sudo supervisorctl restart agenda-musicos`

---

## 📚 Recursos Úteis

- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)

---

**Deploy bem-sucedido!** 🎉

Acesse: https://seudominio.com
