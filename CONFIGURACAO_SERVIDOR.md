# 🖥️ Configuração do Servidor - Agenda de Músicos

## 📋 Informações do Servidor

| Configuração | Valor |
|--------------|-------|
| **IP do Servidor** | 45.237.131.177 |
| **Porta Externa (Nginx)** | 2030 |
| **Porta Interna (Django)** | 8005 |
| **Diretório do Projeto** | /var/www/agenda-musicos |
| **Banco de Dados** | PostgreSQL (agenda_musicos) |
| **Usuário BD** | agenda_user |

## 🚀 Deploy Automático

### Instalação Inicial

```bash
# 1. Clonar repositório no servidor
git clone <url-do-repositorio> /tmp/agenda-musicos
cd /tmp/agenda-musicos

# 2. Executar script de instalação
sudo ./setup.sh
```

O script `setup.sh` faz TUDO automaticamente:
- Instala dependências (Python, Node, PostgreSQL, Nginx, Supervisor)
- Cria banco de dados PostgreSQL
- Configura ambiente Python
- Migra banco de dados
- Popula com músicos de teste
- Faz build do frontend
- Configura Nginx na porta 2030
- Configura Supervisor
- Configura permissões
- Configura firewall

### Atualizações Futuras

```bash
# No servidor, após push de código novo
cd /var/www/agenda-musicos
sudo ./update.sh
```

O script `update.sh` faz:
- Pull do código atualizado
- Instala novas dependências
- Executa migrações
- Rebuild do frontend
- Reinicia serviços

## 📁 Arquivos de Configuração Versionados

### 1. `nginx.conf`
Configuração completa do Nginx:
- Porta externa: 2030
- Proxy reverso para Django (porta 8005)
- Servir arquivos estáticos
- Servir frontend React
- Compressão gzip
- Cache control
- Security headers

**Localização no servidor:** `/etc/nginx/sites-available/agenda-musicos`

### 2. `supervisor.conf`
Configuração do Supervisor para manter Django rodando:
- Gunicorn com 3 workers
- Bind em 127.0.0.1:8005
- Auto-restart
- Logs em /var/log/agenda-musicos/

**Localização no servidor:** `/etc/supervisor/conf.d/agenda-musicos.conf`

### 3. `.env.example` (Backend)
Template de variáveis de ambiente:
```env
SECRET_KEY=<gerado-automaticamente>
DEBUG=False
ALLOWED_HOSTS=45.237.131.177
SERVER_IP=45.237.131.177
SERVER_PORT=2030
INTERNAL_PORT=8005
DATABASE_URL=postgresql://agenda_user:senha@localhost/agenda_musicos
CORS_ORIGINS=http://45.237.131.177:2030
```

**Localização no servidor:** `/var/www/agenda-musicos/.env`

### 4. `frontend/.env.example`
Template de variáveis do frontend:
```env
VITE_API_URL=http://45.237.131.177:2030/api
```

**Localização no servidor:** `/var/www/agenda-musicos/frontend/.env`

## 🔧 Arquitetura do Servidor

```
┌─────────────────────────────────────────────────┐
│              Usuário Externo                    │
│           http://45.237.131.177:2030              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│                  Nginx                          │
│              (Porta 2030)                       │
│                                                 │
│  ┌──────────────────┬──────────────────────┐   │
│  │  /api/*          │  /*                  │   │
│  │  /admin/*        │  (Frontend React)    │   │
│  │  /static/*       │                      │   │
│  └────────┬─────────┴──────────────────────┘   │
└───────────┼─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────┐
│              Gunicorn + Django                  │
│              (127.0.0.1:8005)                   │
│                                                 │
│  Gerenciado por: Supervisor                    │
│  Workers: 3                                     │
│  Timeout: 120s                                  │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│            PostgreSQL Database                  │
│          (agenda_musicos)                       │
└─────────────────────────────────────────────────┘
```

## 📂 Estrutura de Diretórios no Servidor

```
/var/www/agenda-musicos/
├── .venv/                      # Ambiente virtual Python
├── config/                     # Settings Django
├── agenda/                     # App Django
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   └── tests.py
├── frontend/
│   ├── src/                   # Código fonte React
│   └── dist/                  # Build de produção (servido pelo Nginx)
├── staticfiles/               # Arquivos estáticos Django (servido pelo Nginx)
├── media/                     # Uploads (servido pelo Nginx)
├── .env                       # Variáveis de ambiente (não versionado)
├── nginx.conf                 # ✅ Versionado
├── supervisor.conf            # ✅ Versionado
├── setup.sh                   # ✅ Versionado
└── update.sh                  # ✅ Versionado

/var/log/agenda-musicos/
├── access.log                 # Logs de acesso
└── error.log                  # Logs de erro

/etc/nginx/sites-available/
└── agenda-musicos             # Cópia de nginx.conf

/etc/supervisor/conf.d/
└── agenda-musicos.conf        # Cópia de supervisor.conf
```

## 🔐 Credenciais e Acessos

### Aplicação Web
**URL:** http://45.237.131.177:2030

**Músicos:**
- `sara / sara2026@` - Vocalista e Violonista
- `arthur / arthur2026@` - Vocalista e Violonista
- `roberto / roberto2026@` - Baterista

### Admin Django
**URL:** http://45.237.131.177:2030/admin/

**Credenciais:**
- User: `admin`
- Pass: `admin2026@`

### Banco de Dados
**PostgreSQL:**
- Database: `agenda_musicos`
- User: `agenda_user`
- Password: `agenda_password_2024` (definido no setup.sh)
- Host: `localhost`
- Port: `5432`

## 🛠️ Comandos Úteis

### Ver Status
```bash
# Status do backend (Django)
sudo supervisorctl status agenda-musicos

# Status do Nginx
sudo systemctl status nginx

# Status do PostgreSQL
sudo systemctl status postgresql
```

### Ver Logs
```bash
# Logs do backend (Django)
sudo supervisorctl tail -f agenda-musicos

# Logs de erro do backend
sudo tail -f /var/log/agenda-musicos/error.log

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Reiniciar Serviços
```bash
# Reiniciar backend
sudo supervisorctl restart agenda-musicos

# Reiniciar Nginx
sudo systemctl restart nginx

# Reiniciar PostgreSQL (cuidado!)
sudo systemctl restart postgresql
```

### Django Management
```bash
cd /var/www/agenda-musicos
source .venv/bin/activate

# Criar novo superuser
python manage.py createsuperuser

# Executar shell Django
python manage.py shell

# Ver migrações pendentes
python manage.py showmigrations

# Executar testes
python manage.py test
```

## 🔄 Fluxo de Requisição

1. **Usuário acessa:** `http://45.237.131.177:2030`

2. **Nginx recebe** na porta 2030

3. **Nginx decide o destino:**
   - `/api/*` → Proxy para Django (127.0.0.1:8005)
   - `/admin/*` → Proxy para Django (127.0.0.1:8005)
   - `/static/*` → Serve de /var/www/agenda-musicos/staticfiles/
   - `/*` → Serve frontend React de /var/www/agenda-musicos/frontend/dist/

4. **Django (Gunicorn)** processa requisições de API
   - 3 workers em paralelo
   - Timeout de 120 segundos
   - Gerenciado pelo Supervisor (auto-restart)

5. **PostgreSQL** armazena dados

## 📊 Monitoramento

### Verificar se tudo está rodando
```bash
# Verificar porta 2030 (Nginx)
sudo lsof -i :2030

# Verificar porta 8005 (Django)
sudo lsof -i :8005

# Verificar porta 5432 (PostgreSQL)
sudo lsof -i :5432

# Verificar processos
ps aux | grep gunicorn
ps aux | grep nginx
ps aux | grep postgres
```

### Uso de recursos
```bash
# Uso de CPU e memória
htop

# Espaço em disco
df -h

# Tamanho do banco de dados
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('agenda_musicos'));"
```

## 🆘 Troubleshooting Rápido

### Aplicação não responde
```bash
# 1. Verificar Nginx
sudo nginx -t
sudo systemctl status nginx
sudo systemctl restart nginx

# 2. Verificar Django
sudo supervisorctl status agenda-musicos
sudo supervisorctl tail agenda-musicos stderr
sudo supervisorctl restart agenda-musicos

# 3. Verificar PostgreSQL
sudo systemctl status postgresql
```

### 502 Bad Gateway
```bash
# Django não está rodando
sudo supervisorctl restart agenda-musicos

# Verificar logs
sudo tail -f /var/log/agenda-musicos/error.log
```

### Frontend não atualiza
```bash
# Rebuild frontend
cd /var/www/agenda-musicos/frontend
npm run build

# Limpar cache do Nginx
sudo systemctl reload nginx
```

### Mudanças no código não aparecem
```bash
# Use o script de atualização
cd /var/www/agenda-musicos
sudo ./update.sh
```

## 📋 Checklist Pós-Instalação

- [ ] Nginx respondendo na porta 2030
- [ ] Django rodando na porta 8005 (interno)
- [ ] PostgreSQL ativo
- [ ] Frontend carregando (http://45.237.131.177:2030)
- [ ] Login funcionando
- [ ] API respondendo (http://45.237.131.177:2030/api/)
- [ ] Admin Django acessível (http://45.237.131.177:2030/admin/)
- [ ] Logs sendo gerados
- [ ] Firewall configurado
- [ ] Auto-restart do Django funcionando

## 🔒 Segurança

### Firewall (UFW)
```bash
# Ver regras
sudo ufw status

# Regras configuradas pelo setup.sh:
# - Porta 2030 (aplicação)
# - Porta 22 (SSH)
```

### Permissões
```bash
# Dono dos arquivos: www-data
ls -la /var/www/agenda-musicos/

# Permissões: 755 (leitura e execução para todos, escrita apenas para dono)
```

### Backups Recomendados

**Banco de Dados:**
```bash
# Backup
sudo -u postgres pg_dump agenda_musicos > backup_$(date +%Y%m%d).sql

# Restore
sudo -u postgres psql agenda_musicos < backup_20250109.sql
```

**Arquivos:**
```bash
# Backup do projeto (sem .venv e node_modules)
tar -czf agenda_backup_$(date +%Y%m%d).tar.gz \
  --exclude='.venv' \
  --exclude='node_modules' \
  --exclude='*.pyc' \
  /var/www/agenda-musicos/
```

---

**✅ Configuração completa e pronta para produção!**
