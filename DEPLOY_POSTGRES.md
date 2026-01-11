# Guia de Deploy - PostgreSQL em Produção

## ✅ Configuração Atual (Verificada)

O sistema **já está configurado** para usar PostgreSQL em produção. Aqui está o que foi verificado:

### 1. Arquivo `.env.docker` (Produção)

```bash
# Credenciais do PostgreSQL
POSTGRES_DB=agenda
POSTGRES_USER=agenda
POSTGRES_PASSWORD=ugaFxHP8TeYS8DUse1RVHOH2

# URL de conexão (usa o serviço Docker "db")
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

✅ **Status**: Configurado corretamente
- Usa variáveis de ambiente
- Aponta para o serviço `db` (interno do Docker)
- Credenciais seguras

### 2. Docker Compose Produção

O arquivo `docker-compose.prod.yml` já tem:

**Serviço PostgreSQL** (linhas 2-20):
```yaml
db:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: ${POSTGRES_DB}
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  volumes:
    - postgres_data:/var/lib/postgresql/data  # Persistência de dados
  restart: unless-stopped
  networks:
    - internal
```

✅ **Status**: Configurado corretamente
- PostgreSQL 15 Alpine
- Dados persistidos em volume Docker
- Restart automático
- Rede interna isolada

**Backend com Migrations Automáticas** (linhas 22-55):
```yaml
backend:
  depends_on:
    - db
  command:
    - sh
    - -c
    - |
      python manage.py migrate --noinput &&
      python manage.py collectstatic --noinput &&
      exec gunicorn config.wsgi:application ...
```

✅ **Status**: Migrations rodam automaticamente
- Backend espera o `db` subir primeiro (`depends_on`)
- Migrations aplicadas antes do Gunicorn iniciar
- Fail-fast: se migration falhar, backend não sobe

### 3. Volume de Persistência

```yaml
volumes:
  postgres_data:
```

✅ **Status**: Dados persistem entre restarts
- Volume nomeado `postgres_data`
- Dados não são perdidos ao recriar containers

## 🚀 Deploy em Produção (Servidor)

### Pré-requisitos no Servidor

1. **Docker e Docker Compose instalados**

   **⚠️ Se Docker não está instalado**, use o script de instalação:

   ```bash
   # No servidor
   cd /opt/agenda-musicos/agenda_musicos
   bash install-docker.sh

   # Depois fazer logout/login para usar docker sem sudo
   exit
   # Logar novamente via SSH
   ```

   **Ou instale manualmente**:
   ```bash
   # Instalação rápida via script oficial
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER

   # Logout e login novamente
   ```

   **Verificar instalação**:
   ```bash
   docker --version          # >= 20.10
   docker compose version    # v2.x (sem hífen!)
   ```

   **Nota**: Usar `docker compose` (com espaço) não `docker-compose` (com hífen).

2. **Arquivos necessários no servidor**:
   - `.env.docker` (com credenciais corretas)
   - `docker-compose.prod.yml`
   - Código do projeto
   - `install-docker.sh` (script de instalação - opcional)

### Comandos de Deploy

#### 1. Build das Imagens

```bash
cd /caminho/do/projeto
docker-compose -f docker-compose.prod.yml build --no-cache
```

**Tempo estimado**: 3-5 minutos

#### 2. Subir os Serviços

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**O que acontece**:
1. ✅ PostgreSQL sobe primeiro
2. ✅ Backend espera o DB estar pronto
3. ✅ **Migrations aplicadas automaticamente**
4. ✅ Frontend, Payment Service e Nginx sobem
5. ✅ Aplicação disponível

#### 3. Verificar Status

```bash
# Ver todos os containers
docker-compose -f docker-compose.prod.yml ps

# Ver logs do backend (migrations)
docker-compose -f docker-compose.prod.yml logs backend | grep migrate

# Ver logs do PostgreSQL
docker-compose -f docker-compose.prod.yml logs db | tail -50
```

**Status esperado**:
```
NAME                        STATUS
agenda_musicos-db-1         Up (healthy)
agenda_musicos-backend-1    Up
agenda_musicos-frontend-1   Up
agenda_musicos-nginx-1      Up
```

## 🔍 Verificações Importantes

### 1. Verificar Migrations Aplicadas

```bash
# Entrar no container do backend
docker-compose -f docker-compose.prod.yml exec backend sh

# Dentro do container
python manage.py showmigrations

# Deve mostrar todas as migrations com [X]
# ...
# agenda
#  [X] 0001_initial
#  [X] 0002_...
#  ...
#  [X] 0023_add_city_to_musician  # <-- Nova migration
```

### 2. Verificar Conexão ao PostgreSQL

```bash
# Conectar ao banco via psql
docker-compose -f docker-compose.prod.yml exec db psql -U agenda -d agenda

# Dentro do psql
\dt                           # Listar tabelas
\d agenda_musician            # Ver estrutura da tabela Musician
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'agenda_musician' AND column_name = 'city';
\q
```

**Esperado**: Tabela `agenda_musician` com coluna `city` (varchar 100)

### 3. Verificar Volume de Dados

```bash
# Ver volumes
docker volume ls | grep postgres

# Inspecionar volume
docker volume inspect agenda_musicos_postgres_data
```

**Mountpoint esperado**: `/var/lib/docker/volumes/agenda_musicos_postgres_data/_data`

### 4. Testar API

```bash
# Do servidor
curl http://localhost:8000/api/musicians/

# De fora (via domínio)
curl https://gigflowagenda.com.br/api/musicians/
```

**Esperado**: JSON com lista de músicos (pode estar vazio se não tem dados)

## 🔄 Atualização/Redeploy

### Deploy de Novas Versões (com novas migrations)

```bash
# 1. Fazer pull do código atualizado
git pull origin main

# 2. Rebuild (apenas serviços que mudaram)
docker-compose -f docker-compose.prod.yml build backend frontend

# 3. Restart com migrations automáticas
docker-compose -f docker-compose.prod.yml up -d backend

# 4. Verificar logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

**Importante**: As migrations rodam automaticamente ao reiniciar o backend.

### Rollback de Migration (se necessário)

```bash
# Entrar no backend
docker-compose -f docker-compose.prod.yml exec backend sh

# Reverter migration específica
python manage.py migrate agenda 0022_alter_leaderavailability_options_musician_base_fee_and_more

# Ou reverter todas do app
python manage.py migrate agenda zero
```

## 💾 Backup do PostgreSQL

### Criar Backup

```bash
# Backup completo do banco
docker-compose -f docker-compose.prod.yml exec db pg_dump -U agenda agenda > backup_$(date +%Y%m%d_%H%M%S).sql

# Ou com compressão
docker-compose -f docker-compose.prod.yml exec db pg_dump -U agenda agenda | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restaurar Backup

```bash
# Parar backend para evitar conflitos
docker-compose -f docker-compose.prod.yml stop backend

# Restaurar
cat backup_20260111_123000.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U agenda -d agenda

# Ou se comprimido
zcat backup_20260111_123000.sql.gz | docker-compose -f docker-compose.prod.yml exec -T db psql -U agenda -d agenda

# Reiniciar backend
docker-compose -f docker-compose.prod.yml start backend
```

## 🛠️ Troubleshooting

### Problema: "relation agenda_musician does not exist"

**Causa**: Migrations não foram aplicadas

**Solução**:
```bash
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml logs backend | grep migrate
```

### Problema: "role agenda does not exist"

**Causa**: Variáveis de ambiente não estão carregando

**Solução**:
```bash
# Verificar se .env.docker existe e tem as variáveis
cat .env.docker | grep POSTGRES

# Recriar serviço db
docker-compose -f docker-compose.prod.yml down db
docker-compose -f docker-compose.prod.yml up -d db
```

### Problema: Backend não conecta ao banco

**Causa**: PostgreSQL não está pronto quando backend inicia

**Solução**: O `depends_on` e `healthcheck` já estão configurados, mas se persistir:
```bash
# Aguardar o DB estar pronto
docker-compose -f docker-compose.prod.yml up -d db
sleep 10
docker-compose -f docker-compose.prod.yml up -d backend
```

### Problema: Dados perdidos após restart

**Causa**: Volume não está persistindo

**Solução**:
```bash
# Verificar se volume existe
docker volume ls | grep postgres_data

# Se não existir, recriar com volume
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoramento

### Ver uso de recursos

```bash
# CPU e memória de cada container
docker stats

# Tamanho do volume do PostgreSQL
docker system df -v | grep postgres_data
```

### Ver conexões ativas

```bash
docker-compose -f docker-compose.prod.yml exec db psql -U agenda -d agenda -c "SELECT count(*) FROM pg_stat_activity WHERE datname='agenda';"
```

## ✅ Checklist de Deploy

Antes de fazer deploy em produção:

- [ ] `.env.docker` com credenciais seguras
- [ ] Docker e Docker Compose instalados no servidor
- [ ] Build das imagens executado sem erros
- [ ] Todos os containers rodando (`docker-compose ps`)
- [ ] Migrations aplicadas (verificar logs do backend)
- [ ] Tabela `agenda_musician` com coluna `city` existe
- [ ] Volume `postgres_data` criado e persistindo
- [ ] API respondendo em `/api/musicians/`
- [ ] Frontend acessível via domínio
- [ ] Backup inicial criado

## 🎯 Resumo

**PostgreSQL em Produção está configurado corretamente:**

✅ Container PostgreSQL 15 Alpine
✅ Credenciais em `.env.docker`
✅ Volume persistente para dados
✅ Migrations automáticas no deploy
✅ Rede interna isolada
✅ Restart automático
✅ Health checks configurados

**Para fazer deploy:**
```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs backend | grep migrate
```

**Tudo funcionando!** 🚀
