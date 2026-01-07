# 🎵 Agenda de Músicos

Sistema completo de gerenciamento de agenda para bandas e músicos.

## 📋 Descrição

Aplicação web para gerenciar eventos, disponibilidade de músicos e convites entre usuários cadastrados. A plataforma permite que músicos se conectem e fechem gigs diretamente.


### Pré-requisitos
- Ubuntu 20.04+ ou Debian 11+
- Acesso root (sudo)
- Git instalado

### Instalação Automática

```bash
# 1. Clonar repositório
git clone <url-do-repositorio> /tmp/agenda-musicos
cd /tmp/agenda-musicos

# 2. Executar script de instalação
sudo ./setup.sh
```

O script `setup.sh` irá automaticamente:
- ✅ Instalar todas as dependências (Python, Node.js, PostgreSQL, Nginx, Supervisor)
- ✅ Criar e configurar o banco de dados PostgreSQL
- ✅ Configurar ambiente Python e instalar dependências
- ✅ Executar migrações do Django
- ✅ Popular banco com músicos de teste
- ✅ Fazer build do frontend React
- ✅ Configurar Nginx na porta 2030
- ✅ Configurar Supervisor para manter Django rodando
- ✅ Configurar permissões e firewall

### Após a Instalação

Acesse: **http://45.237.131.177:2030**

**Credenciais de Login:**
- Sara (Vocalista): `sara / sara2026@`
- Arthur (Vocalista): `arthur / arthur2026@`
- Roberto (Baterista): `roberto / roberto2026@`

**Admin Django:**
- URL: http://45.237.131.177:2030/admin/
- User: `admin`
- Pass: `admin2026@`

## 🔄 Atualizar Aplicação

Após fazer mudanças no código e fazer push para o repositório:

```bash
# No servidor
cd /var/www/agenda-musicos
sudo ./update.sh
```

O script `update.sh` irá:
- ✅ Fazer pull do código atualizado
- ✅ Instalar novas dependências (se houver)
- ✅ Executar novas migrações
- ✅ Rebuild do frontend
- ✅ Reiniciar serviços

## 💻 Desenvolvimento Local

### Backend Django
```bash
# Ativar ambiente virtual
source .venv/bin/activate

# Popular banco de dados
python manage.py populate_db

# Rodar servidor
python manage.py runserver
```

Backend: http://localhost:8000

### Frontend React
```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## 📊 Funcionalidades

### Para Todos os Músicos
- ✅ Login com autenticação JWT
- ✅ Visualizar eventos
- ✅ Criar propostas de eventos
- ✅ Marcar disponibilidade (Disponível/Indisponível/Talvez/Pendente)
- ✅ Ver disponibilidade de todos os músicos
- ✅ Visualizar perfis dos músicos

### Convites e Confirmações
- ✅ Responder convites pendentes
- ✅ Confirmar participação ao marcar disponibilidade como "Disponível"

## 🛠️ Comandos Úteis

### Ver Logs
```bash
# Logs do Django
sudo supervisorctl tail -f agenda-musicos

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Gerenciar Serviços
```bash
# Status
sudo supervisorctl status
sudo systemctl status nginx

# Reiniciar
sudo supervisorctl restart agenda-musicos
sudo systemctl restart nginx
```

### Django Management
```bash
cd /var/www/agenda-musicos
source .venv/bin/activate

# Criar superuser
python manage.py createsuperuser

# Popular banco com músicos
python manage.py populate_db

# Executar testes
python manage.py test
```

## 📂 Estrutura do Projeto

```
agenda-musicos/
├── config/                 # Configurações Django
├── agenda/                 # App principal
│   ├── models.py          # Musician, Event, Availability
│   ├── views.py           # API ViewSets
│   ├── serializers.py     # DRF Serializers
│   ├── permissions.py     # Permissões customizadas
│   └── tests.py           # Testes unitários (9/9 ✅)
├── frontend/              # React + TypeScript
│   ├── src/
│   │   ├── pages/        # Login, Dashboard, Events, Musicians
│   │   ├── components/   # Layout, Navbar, Loading
│   │   ├── contexts/     # AuthContext
│   │   └── services/     # API calls
│   └── dist/             # Build de produção
├── nginx.conf             # ⚙️ Configuração Nginx
├── supervisor.conf        # ⚙️ Configuração Supervisor
├── setup.sh              # 🚀 Script de instalação
├── update.sh             # 🔄 Script de atualização
└── requirements.txt      # Dependências Python
```

## 🔒 Segurança

- JWT Authentication
- CORS configurado
- SQL Injection protection (Django ORM)
- XSS protection
- CSRF protection
- Validações frontend e backend
- Permissões por papel (member/leader)

## 🧪 Testes

```bash
cd /var/www/agenda-musicos
source .venv/bin/activate
python manage.py test
```

**9 testes unitários** cobrindo:
- Modelos (Musician, Event, Availability)
- API endpoints
- Permissões
- Validações

## 📚 Documentação Adicional

- `GUIA_COMPLETO.md` - Manual completo do usuário
- `DEPLOY.md` - Guia detalhado de deploy manual
- `PREPARACAO_PRODUCAO.md` - Checklist de produção
- `MELHORIAS_PROFISSIONAIS.md` - Melhorias implementadas

## 🐛 Troubleshooting

### Backend não responde
```bash
sudo supervisorctl status agenda-musicos
sudo supervisorctl tail agenda-musicos stderr
sudo supervisorctl restart agenda-musicos
```

### Frontend não carrega
```bash
ls -la /var/www/agenda-musicos/frontend/dist
cd /var/www/agenda-musicos/frontend
npm run build
sudo systemctl restart nginx
```

### 502 Bad Gateway
- Verificar se backend está rodando: `sudo lsof -i :8005`
- Reiniciar: `sudo supervisorctl restart agenda-musicos`

### CORS Error
- Verificar `CORS_ORIGINS` em `/var/www/agenda-musicos/.env`
- Deve incluir: `http://45.237.131.177:2030`
- Reiniciar após mudanças

## 🎨 Tecnologias

**Backend:**
- Django 5.2
- Django REST Framework
- PostgreSQL
- Gunicorn
- JWT Authentication

**Frontend:**
- React 18
- TypeScript
- Vite
- TailwindCSS v3
- Axios

**Infraestrutura:**
- Nginx (reverse proxy)
- Supervisor (process manager)
- Ubuntu/Debian Linux

## 📝 Licença

Este projeto é propriedade privada.

---
