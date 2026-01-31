# 🎵 Agenda de Músicos - GigFlow

Sistema completo de gerenciamento de agenda para bandas e músicos.

## 📋 Descrição

Aplicação web para gerenciar eventos, disponibilidade de músicos e convites entre usuários cadastrados. A plataforma permite que músicos se conectem e fechem gigs diretamente.

## 🚀 Instalação Rápida

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

## 📚 Documentação da API

Após iniciar o servidor, acesse:

- **Swagger UI (Interativo)**: http://localhost:8000/api/docs/
- **ReDoc (Documentação Limpar)**: http://localhost:8000/api/redoc/
- **OpenAPI Schema (JSON)**: http://localhost:8000/api/schema/

A documentação inclui:
- Todos os endpoints disponíveis
- Parâmetros de request/response
- Autenticação JWT
- Exemplos de uso
- Teste interativo direto no navegador

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

# Formatar código Python
make format

# Verificar estilo
make lint

# Popular banco de dados
python manage.py populate_db

# Rodar servidor
python manage.py runserver
```

Backend: http://localhost:8000
API Docs: http://localhost:8000/api/docs/

### Frontend React

```bash
cd frontend
npm install

# Desenvolvimento
npm run dev

# Formatar código
npm run format

# Verificar erros
npm run lint

# Rodar testes
npm run test

# Build de produção
npm run build
```

Frontend: http://localhost:5173

### Testes Automatizados

**Frontend (Vitest + React Testing Library):**
```bash
cd frontend

# Modo watch (desenvolvimento)
npm run test

# Uma vez (CI/CD)
npm run test:ci

# Com cobertura
npm run test:coverage
```

**Backend (Django):**
```bash
# Rodar todos os testes
python manage.py test

# Rodar testes de um app específico
python manage.py test agenda.tests

# Com cobertura
coverage run --source='.' manage.py test
coverage report
coverage html
```

### OAuth Google (dev e docker)

Dependências já estão em `requirements.txt` e são instaladas no build do Docker.

Variáveis necessárias:
- `GOOGLE_CLIENT_ID` (backend)
- `VITE_GOOGLE_CLIENT_ID` (frontend)
- `CORS_ALLOW_CREDENTIALS=True`
- `CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`

Se estiver usando Docker (compose dev):
```bash
export GOOGLE_CLIENT_ID=seu-client-id
export VITE_GOOGLE_CLIENT_ID=seu-client-id
docker compose -f docker-compose.dev.yml up --build
```

## 📊 Funcionalidades

### Para Todos os Músicos
- ✅ Login com autenticação JWT
- ✅ Visualizar eventos
- ✅ Criar propostas de eventos
- ✅ Marcar disponibilidade (Disponível/Indisponível/Talvez/Pendente)
- ✅ Ver disponibilidade de todos os músicos
- ✅ Visualizar perfis dos músicos
- ✅ Sistema de badges e conquistas
- ✅ Conexões entre músicos

### Convites e Confirmações
- ✅ Responder convites pendentes
- ✅ Confirmar participação ao marcar disponibilidade como "Disponível"
- ✅ Notificações em tempo real

### Para Empresas
- ✅ Cadastro de empresa
- ✅ Busca de músicos por instrumento
- ✅ Solicitações de contato
- ✅ Gestão de eventos corporativos

## 🛠️ Comandos Úteis

### Makefile (Backend)

```bash
# Formatar código com Black e isort
make format

# Verificar formatação
make format-check

# Verificar estilo com flake8
make lint

# Rodar testes
make test

# Rodar testes com cobertura
make test-coverage

# Instalar dependências de dev
make install-dev

# Rodar todas as verificações (CI)
make ci
```

### Scripts NPM (Frontend)

```bash
cd frontend

# Desenvolvimento
npm run dev

# Build
npm run build

# Linting
npm run lint
npm run lint:fix

# Formatação
npm run format
npm run format:check

# Testes
npm run test
npm run test:ci
npm run test:coverage

# Preview do build
npm run preview
```

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

# Shell do Django
python manage.py shell

# Check do sistema
python manage.py check
python manage.py check --deploy
```

## 📂 Estrutura do Projeto

```
agenda-musicos/
├── config/                          # Configurações Django
│   ├── settings.py                  # Configurações principais
│   ├── urls.py                      # URLs principais
│   ├── auth_views.py               # Views de autenticação
│   └── admin_urls.py               # URLs do admin
├── agenda/                          # App principal
│   ├── models.py                    # Musician, Event, Availability
│   ├── views/                       # 🆕 Módulos ViewSets (refatorado!)
│   │   ├── __init__.py
│   │   ├── instruments.py          # InstrumentViewSet
│   │   ├── badges.py               # BadgeViewSet
│   │   ├── connections.py          # ConnectionViewSet
│   │   ├── musicians.py            # MusicianViewSet
│   │   ├── availabilities.py       # AvailabilityViewSet
│   │   ├── leader_availabilities.py # LeaderAvailabilityViewSet
│   │   └── events.py               # EventViewSet (852 linhas)
│   ├── serializers.py              # DRF Serializers
│   ├── permissions.py              # Permissões customizadas
│   ├── throttles.py                # Rate limiting
│   ├── validators.py               # Validações customizadas
│   ├── pagination.py               # Paginação
│   └── tests/                      # Testes organizados
│       ├── test_models.py
│       ├── test_views.py
│       └── test_serializers.py
├── marketplace/                     # App de marketplace
├── notifications/                   # App de notificações
├── frontend/                        # React + TypeScript
│   ├── src/
│   │   ├── pages/                  # Login, Dashboard, Events
│   │   ├── components/             # Componentes reutilizáveis
│   │   ├── contexts/               # AuthContext, CompanyAuthContext
│   │   ├── hooks/                  # Custom hooks (useEvents, etc)
│   │   ├── services/               # 🆕 API services (refatorado!)
│   │   │   ├── api.ts              # Config base (108 linhas)
│   │   │   ├── authService.ts
│   │   │   ├── musicianService.ts
│   │   │   ├── eventService.ts
│   │   │   ├── connectionService.ts
│   │   │   ├── badgeService.ts
│   │   │   └── ...
│   │   ├── test/                   # 🆕 Testes (Vitest + RTL)
│   │   │   ├── setup.ts
│   │   │   └── example.test.tsx
│   │   └── types/                  # Tipos TypeScript
│   ├── vitest.config.ts            # 🆕 Config Vitest
│   └── package.json
├── docs/                            # Documentação
│   ├── API_DOCUMENTATION.md        # 🆕 Guia Swagger/OpenAPI
│   ├── authentication-flows.md
│   └── ...
├── nginx.conf                       # Configuração Nginx
├── supervisor.conf                  # Configuração Supervisor
├── docker-compose.yml               # Docker produção
├── docker-compose.dev.yml           # Docker desenvolvimento
├── Makefile                         # 🆕 Comandos automatizados
├── pyproject.toml                   # 🆕 Config Python tooling
├── setup.sh                         # Script de instalação
├── update.sh                        # Script de atualização
├── requirements.txt                 # Dependências Python
└── .husky/                          # 🆕 Git hooks (pre-commit)
```

## 🔧 Tooling e Qualidade de Código

### Pre-commit Hooks (Husky)

Hooks configurados para rodar automaticamente antes de cada commit:
- ✅ ESLint --fix (frontend)
- ✅ Prettier --write (frontend)
- ✅ Formatação automática de código

### Formatação Automática

**Python:**
- **Black**: Formatação consistente (100 caracteres/linha)
- **isort**: Organização de imports
- **flake8**: Linting e verificação de estilo

**TypeScript/JavaScript:**
- **Prettier**: Formatação automática
- **ESLint**: Análise estática de código

### Configurações

- `pyproject.toml` - Configuração Black, isort, flake8
- `frontend/.prettierrc` - Configuração Prettier
- `frontend/eslint.config.js` - Configuração ESLint
- `frontend/vitest.config.ts` - Configuração Vitest

## 🔒 Segurança

- JWT Authentication (cookies httpOnly)
- CORS configurado
- Rate limiting (throttling) por endpoint
- SQL Injection protection (Django ORM)
- XSS protection (CSP headers)
- CSRF protection
- Validações frontend e backend
- Permissões por papel (member/leader/company)
- Admin URL protegida por variável de ambiente

## 🧪 Testes

### Backend (Django)

```bash
cd /var/www/agenda-musicos
source .venv/bin/activate
python manage.py test
```

**Cobertura:**
- Modelos (Musician, Event, Availability)
- API endpoints
- Permissões
- Validações
- Fluxos de autenticação

### Frontend (Vitest + React Testing Library)

```bash
cd frontend
npm run test:ci
```

**Estrutura:**
- `src/test/setup.ts` - Configuração e mocks
- `src/test/example.test.tsx` - Exemplos de testes
- Comandos: `test`, `test:ci`, `test:coverage`

## 📚 Documentação Adicional

- `docs/API_DOCUMENTATION.md` - 🆕 Guia completo Swagger/OpenAPI
- `docs/GUIA_COMPLETO.md` - Manual completo do usuário
- `docs/DEPLOY.md` - Guia detalhado de deploy manual
- `docs/PREPARACAO_PRODUCAO.md` - Checklist de produção
- `docs/MELHORIAS_PROFISSIONAIS.md` - Melhorias implementadas
- `docs/CONFIGURACAO_GOOGLE_OAUTH.md` - Setup OAuth Google
- `agenda/views/REFACTORING_STATUS.md` - Status da refatoração
- `agenda/serializers/REFACTORING_PLAN.md` - Plano de refatoração

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
- Verificar `CORS_ORIGINS` em `/var/www/agenda-musicos/.env.docker`
- Deve incluir: `http://45.237.131.177:2030`
- Reiniciar após mudanças

### Testes Falhando
```bash
# Frontend
cd frontend
npm run test:ci

# Backend
python manage.py test --verbosity=2
```

## 🎨 Tecnologias

**Backend:**
- Django 5.2
- Django REST Framework 3.16
- PostgreSQL 15
- Gunicorn
- JWT Authentication (SimpleJWT)
- drf-spectacular (OpenAPI/Swagger)
- Google OAuth2

**Frontend:**
- React 19
- TypeScript 5.9
- Vite 7
- TailwindCSS v3
- Axios
- SWR (data fetching)
- Vitest + React Testing Library

**Infraestrutura:**
- Nginx (reverse proxy)
- Supervisor (process manager)
- Docker + Docker Compose
- Ubuntu/Debian Linux

**Tooling:**
- Black, isort, flake8 (Python)
- Prettier, ESLint (TypeScript)
- Husky (git hooks)
- Makefile (automação)

## 📝 Convenções de Código

### Python
- **Black**: 100 caracteres por linha
- **isort**: Imports organizados (profile black)
- **flake8**: Linting com max-line-length 100
- Docstrings em português para manter consistência

### TypeScript
- **Prettier**: Aspas simples, ponto-e-vírgula
- **ESLint**: Regras React + TypeScript
- Componentes: PascalCase
- Hooks: camelCase com prefixo `use`

### Commits
Seguindo Conventional Commits:
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação (sem mudança de código)
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Tarefas de manutenção

## 🤝 Contribuição

1. Crie uma branch: `git checkout -b feature/nome-da-feature`
2. Faça commits com mensagens claras
3. Push para a branch: `git push origin feature/nome-da-feature`
4. Abra um Pull Request

O Husky garantirá que seu código esteja formatado antes de cada commit!

## 📝 Licença

Este projeto é propriedade privada.

---

**Desenvolvido com ❤️ para músicos**  
*Última atualização: Janeiro 2026*
