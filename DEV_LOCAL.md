# Desenvolvimento Local - PostgreSQL

## ✅ Setup Completo

O projeto está configurado para usar **PostgreSQL via Docker** em desenvolvimento.

### Arquitetura

```
┌─────────────────────┐
│   Docker Desktop    │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  PostgreSQL 15      │
│  porta: 5433        │  ← Container Docker
│  user: agenda       │
│  pass: agenda       │
│  db: agenda         │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Django Backend     │  ← Roda localmente (não em Docker)
│  porta: 8000        │
└─────────────────────┘
```

## 🚀 Quick Start

### 1. Iniciar PostgreSQL

```bash
docker-compose -f docker-compose.dev.yml up db -d
```

### 2. Iniciar Backend

Use o script `dev.sh`:

```bash
./dev.sh start
```

As variáveis são carregadas do `.env.local` (fallback `.env.docker`).

### 3. Acessar

- **Backend**: http://localhost:8000
- **Admin**: http://localhost:8000/admin
- **API**: http://localhost:8000/api/

## 📜 Scripts Disponíveis

O script `dev.sh` facilita comandos comuns:

```bash
./dev.sh start            # Inicia o backend
./dev.sh migrate          # Aplica migrations
./dev.sh shell            # Django shell
./dev.sh dbshell          # PostgreSQL psql
./dev.sh test             # Roda testes
./dev.sh createsuperuser  # Cria admin
```

## 🗄️ Banco de Dados

### Conexão

- **Host**: localhost
- **Porta**: 5433 (mapeada do container 5432)
- **Database**: agenda
- **User**: agenda
- **Password**: agenda

### Comandos Úteis

**Ver status do PostgreSQL**:
```bash
docker-compose -f docker-compose.dev.yml ps
```

**Ver logs**:
```bash
docker-compose -f docker-compose.dev.yml logs db
```

**Conectar via psql**:
```bash
docker-compose -f docker-compose.dev.yml exec db psql -U agenda -d agenda
```

**Parar PostgreSQL**:
```bash
docker-compose -f docker-compose.dev.yml stop db
```

**Reset completo** (apaga todos os dados):
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up db -d
./dev.sh migrate
```

## ✅ Verificações

### Migrations Aplicadas

```bash
./dev.sh migrate
DATABASE_URL="postgresql://agenda:agenda@localhost:5433/agenda" python manage.py showmigrations
```

Deve mostrar todas as migrations com `[X]`, incluindo:
- `[X] 0023_add_city_to_musician`

### Tabela Musician com campo city

```bash
docker-compose -f docker-compose.dev.yml exec db psql -U agenda -d agenda -c "\d agenda_musician"
```

Deve mostrar coluna `city` (varchar 100, nullable).

## 🔧 Troubleshooting

### PostgreSQL não está rodando

**Erro**: `connection refused`

**Solução**:
```bash
# Verificar se Docker Desktop está rodando
docker ps

# Iniciar PostgreSQL
docker-compose -f docker-compose.dev.yml up db -d
```

### Backend não conecta ao banco

**Erro**: `role "agenda" does not exist`

**Solução**: Use o script `dev.sh` que carrega as variáveis corretas:
```bash
./dev.sh start
```

### Porta 5433 já está em uso

**Solução**: Altere a porta no `docker-compose.dev.yml`:
```yaml
ports:
  - "5434:5432"  # Troque 5433 por 5434
```

E no `.env.local`:
```bash
DATABASE_URL=postgresql://agenda:agenda@localhost:5434/agenda
```

## 📦 Frontend

O frontend roda separadamente:

```bash
cd frontend
npm run dev
```

- **URL**: http://localhost:5173
- **API URL**: http://localhost:8000/api

## 🌐 Ambiente Completo (Docker)

Para rodar tudo em Docker (backend + frontend + PostgreSQL):

```bash
docker-compose -f docker-compose.dev.yml up
```

Acesso:
- **Frontend**: http://localhost:5174
- **Backend**: http://localhost:8001

## 📚 Arquivos de Configuração

- `.env.docker` - Fonte principal do servidor (produção)
- `.env.local` - Mesmo formato do `.env.docker`, com valores para dev local
- `docker-compose.dev.yml` - Configuração Docker para desenvolvimento
- `dev.sh` - Script auxiliar (carrega `.env.local`)

## ✅ Status Atual

- ✅ PostgreSQL 15 rodando em Docker (porta 5433)
- ✅ Migrations aplicadas (incluindo city field)
- ✅ Tabela `agenda_musician` com coluna `city` (varchar 100)
- ✅ Backend pronto para rodar localmente
- ✅ Script `dev.sh` configurado

**Tudo pronto para desenvolvimento!** 🎉
