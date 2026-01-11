# Deploy Runbook - Agenda de Músicos

## 📋 Pré-Requisitos

### No Servidor (SSH: arthur@srv1252721)

#### 1. Instalar Docker e Docker Compose

**Opção A: Script Automático (Recomendado)**

```bash
cd /opt/agenda-musicos/agenda_musicos
bash install-docker.sh
```

Após a instalação:
```bash
# Fazer logout e login novamente para aplicar grupo docker
exit
# Logar novamente via SSH
ssh arthur@srv1252721
```

**Opção B: Instalação Manual**

```bash
# Instalar via script oficial
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Fazer logout/login
exit
# Logar novamente
```

#### 2. Verificar Instalação

```bash
docker --version
# Esperado: Docker version 24.x ou superior

docker compose version
# Esperado: Docker Compose version v2.x
```

**IMPORTANTE**: Usar `docker compose` (com espaço), não `docker-compose` (com hífen).

---

## 🚀 Deploy em Produção

### Etapa 1: Preparar Código no Servidor

```bash
# Ir para o diretório do projeto
cd /opt/agenda-musicos/agenda_musicos

# Fazer pull das últimas alterações
git pull origin main

# Verificar se está na branch main
git status
```

**Arquivos críticos que devem existir**:
- [x] `.env.docker` (credenciais de produção)
- [x] `docker-compose.prod.yml`
- [x] `nginx.conf`
- [x] `Dockerfile` (backend)
- [x] `frontend/Dockerfile`
- [x] `payment-service/Dockerfile`

### Etapa 2: Build das Imagens Docker

```bash
# Build de todas as imagens (pode demorar 5-10 minutos)
docker compose -f docker-compose.prod.yml build --no-cache
```

**O que acontece**:
- ✅ Build da imagem do backend (Django + Python dependencies)
- ✅ Build da imagem do frontend (React + TypeScript)
- ✅ Build da imagem do payment-service (Node.js)
- ✅ Pull da imagem do PostgreSQL 15 Alpine
- ✅ Pull da imagem do Nginx 1.27 Alpine

### Etapa 3: Subir os Serviços

```bash
# Subir todos os containers em background
docker compose -f docker-compose.prod.yml up -d
```

**Ordem de inicialização**:
1. PostgreSQL (db)
2. Backend (aguarda db estar pronto)
3. Frontend e Payment Service (aguardam backend)
4. Nginx (aguarda todos os serviços)

### Etapa 4: Verificar Logs e Migrations

```bash
# Ver todos os containers rodando
docker compose -f docker-compose.prod.yml ps

# Esperado:
# NAME                              STATUS
# agenda_musicos-db-1               Up
# agenda_musicos-backend-1          Up
# agenda_musicos-frontend-1         Up
# agenda_musicos-payment-service-1  Up
# agenda_musicos-nginx-1            Up
```

**Verificar migrations aplicadas** (incluindo city field):

```bash
# Ver logs do backend filtrados por migrate
docker compose -f docker-compose.prod.yml logs backend | grep migrate

# Esperado ver:
# Running migrations:
#   ...
#   Applying agenda.0023_add_city_to_musician... OK
```

### Etapa 5: Verificar PostgreSQL

```bash
# Conectar ao PostgreSQL via psql
docker compose -f docker-compose.prod.yml exec db psql -U agenda -d agenda

# Dentro do psql, verificar tabelas
\dt

# Verificar estrutura da tabela Musician (deve ter coluna city)
\d agenda_musician

# Verificar se coluna city existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'agenda_musician' AND column_name = 'city';

# Esperado:
#  column_name | data_type         | is_nullable
# -------------+-------------------+-------------
#  city        | character varying | YES

# Sair do psql
\q
```

### Etapa 6: Testar API

```bash
# Teste interno (dentro do servidor)
curl http://localhost/api/musicians/

# Esperado: JSON com lista de músicos (pode estar vazia)
# [{"id":1,"full_name":"...","city":"São Paulo",...}]
```

**Teste externo** (do seu computador local):

```bash
curl https://gigflowagenda.com.br/api/musicians/
```

### Etapa 7: Verificar Frontend

Acessar no navegador:
- **Frontend**: https://gigflowagenda.com.br
- **Página de Músicos**: https://gigflowagenda.com.br/musicos
- **Registro**: https://gigflowagenda.com.br/register

**Verificar funcionalidades**:
1. Página de registro mostra campo "Cidade" com autocomplete
2. Ao registrar músico, cidade é salva
3. Ao clicar em um músico na listagem, vai para `/musicos/:id`
4. Perfil individual mostra a cidade do músico (se preenchida)

---

## 🔍 Verificações de Saúde

### Ver Logs em Tempo Real

```bash
# Todos os serviços
docker compose -f docker-compose.prod.yml logs -f

# Apenas backend
docker compose -f docker-compose.prod.yml logs -f backend

# Apenas frontend
docker compose -f docker-compose.prod.yml logs -f frontend

# Apenas nginx
docker compose -f docker-compose.prod.yml logs -f nginx

# Apenas PostgreSQL
docker compose -f docker-compose.prod.yml logs -f db
```

### Ver Uso de Recursos

```bash
# CPU e memória de cada container
docker stats

# Ver volumes
docker volume ls

# Ver tamanho do volume do PostgreSQL
docker volume inspect agenda_musicos_postgres_data
```

### Healthcheck dos Containers

```bash
# Status detalhado
docker compose -f docker-compose.prod.yml ps -a

# Inspecionar container específico
docker inspect agenda_musicos-backend-1

# Ver histórico de healthchecks
docker inspect agenda_musicos-backend-1 | grep -A 10 Health
```

---

## 🔄 Atualizações Futuras

### Deploy de Nova Versão (com migrations)

```bash
cd /opt/agenda-musicos/agenda_musicos

# 1. Pull do código
git pull origin main

# 2. Rebuild (apenas serviços que mudaram)
docker compose -f docker-compose.prod.yml build backend frontend

# 3. Restart dos serviços
docker compose -f docker-compose.prod.yml up -d backend frontend

# 4. Verificar migrations (rodam automaticamente)
docker compose -f docker-compose.prod.yml logs backend | grep migrate

# 5. Verificar se tudo está rodando
docker compose -f docker-compose.prod.yml ps
```

**As migrations rodam automaticamente** ao reiniciar o backend (linha 39 do docker-compose.prod.yml).

### Apenas Restart (sem rebuild)

```bash
# Reiniciar todos os serviços
docker compose -f docker-compose.prod.yml restart

# Reiniciar serviço específico
docker compose -f docker-compose.prod.yml restart backend
```

### Rebuild Completo (limpar cache)

```bash
# Parar todos os containers
docker compose -f docker-compose.prod.yml down

# Rebuild sem cache
docker compose -f docker-compose.prod.yml build --no-cache

# Subir novamente
docker compose -f docker-compose.prod.yml up -d
```

---

## 💾 Backup e Restore

### Criar Backup do PostgreSQL

```bash
# Backup completo
docker compose -f docker-compose.prod.yml exec db pg_dump -U agenda agenda > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup comprimido (recomendado)
docker compose -f docker-compose.prod.yml exec db pg_dump -U agenda agenda | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restaurar Backup

```bash
# Parar backend para evitar conflitos
docker compose -f docker-compose.prod.yml stop backend

# Restaurar de backup normal
cat backup_20260111_120000.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U agenda -d agenda

# Restaurar de backup comprimido
zcat backup_20260111_120000.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U agenda -d agenda

# Reiniciar backend
docker compose -f docker-compose.prod.yml start backend
```

### Backup Automatizado (Cron)

```bash
# Adicionar ao crontab
crontab -e

# Backup diário às 3h da manhã
0 3 * * * cd /opt/agenda-musicos/agenda_musicos && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U agenda agenda | gzip > /opt/backups/agenda_$(date +\%Y\%m\%d).sql.gz

# Limpar backups com mais de 7 dias
0 4 * * * find /opt/backups -name "agenda_*.sql.gz" -mtime +7 -delete
```

---

## 🛠️ Troubleshooting

### Problema: Container não sobe

```bash
# Ver logs detalhados
docker compose -f docker-compose.prod.yml logs [nome-do-servico]

# Ver última vez que o container foi restartado
docker inspect agenda_musicos-backend-1 | grep -A 5 State

# Forçar recreação
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
```

### Problema: "relation agenda_musician does not exist"

**Causa**: Migrations não foram aplicadas

**Solução**:
```bash
# Verificar logs do backend
docker compose -f docker-compose.prod.yml logs backend | grep migrate

# Se migrations não rodaram, executar manualmente
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Verificar migrations aplicadas
docker compose -f docker-compose.prod.yml exec backend python manage.py showmigrations
```

### Problema: "role agenda does not exist"

**Causa**: Variáveis de ambiente do PostgreSQL não foram carregadas

**Solução**:
```bash
# Verificar se .env.docker existe
cat .env.docker | grep POSTGRES

# Recriar serviço db
docker compose -f docker-compose.prod.yml down db
docker compose -f docker-compose.prod.yml up -d db

# Aguardar 10 segundos
sleep 10

# Subir backend
docker compose -f docker-compose.prod.yml up -d backend
```

### Problema: Backend não conecta ao PostgreSQL

**Causa**: PostgreSQL não está pronto quando backend inicia

**Solução**:
```bash
# Subir apenas o db primeiro
docker compose -f docker-compose.prod.yml up -d db

# Aguardar 15 segundos
sleep 15

# Subir o resto
docker compose -f docker-compose.prod.yml up -d
```

### Problema: Nginx retorna 502 Bad Gateway

**Causa**: Backend não está respondendo

**Solução**:
```bash
# Verificar se backend está rodando
docker compose -f docker-compose.prod.yml ps backend

# Ver logs do backend
docker compose -f docker-compose.prod.yml logs backend | tail -50

# Verificar se Gunicorn está escutando na porta 8000
docker compose -f docker-compose.prod.yml exec backend netstat -tlnp | grep 8000

# Reiniciar backend
docker compose -f docker-compose.prod.yml restart backend
```

### Problema: Frontend mostra página em branco

**Causa**: Build do frontend falhou ou variáveis de ambiente incorretas

**Solução**:
```bash
# Ver logs do build do frontend
docker compose -f docker-compose.prod.yml logs frontend

# Rebuild do frontend
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend

# Verificar se arquivos estão no container
docker compose -f docker-compose.prod.yml exec frontend ls -la /usr/share/nginx/html
```

### Problema: Dados perdidos após restart

**Causa**: Volume não está persistindo

**Solução**:
```bash
# Verificar se volume existe
docker volume ls | grep postgres_data

# Inspecionar volume
docker volume inspect agenda_musicos_postgres_data

# Se volume não existe, recriar
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoramento

### Ver Conexões Ativas no PostgreSQL

```bash
docker compose -f docker-compose.prod.yml exec db psql -U agenda -d agenda -c "
  SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state
  FROM pg_stat_activity
  WHERE datname='agenda';
"
```

### Ver Tamanho do Banco de Dados

```bash
docker compose -f docker-compose.prod.yml exec db psql -U agenda -d agenda -c "
  SELECT
    pg_size_pretty(pg_database_size('agenda')) AS database_size;
"
```

### Ver Número de Registros por Tabela

```bash
docker compose -f docker-compose.prod.yml exec db psql -U agenda -d agenda -c "
  SELECT
    schemaname,
    tablename,
    n_live_tup AS rows
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC;
"
```

---

## ✅ Checklist de Deploy

Execute este checklist a cada deploy:

### Pré-Deploy
- [ ] Docker e Docker Compose instalados no servidor
- [ ] `.env.docker` existe e tem credenciais corretas
- [ ] Código atualizado (`git pull origin main`)
- [ ] Backup do banco de dados criado

### Durante o Deploy
- [ ] Build executado sem erros: `docker compose -f docker-compose.prod.yml build`
- [ ] Containers subindo: `docker compose -f docker-compose.prod.yml up -d`
- [ ] Todos os containers rodando: `docker compose -f docker-compose.prod.yml ps`

### Pós-Deploy
- [ ] Migrations aplicadas (verificar logs do backend)
- [ ] PostgreSQL respondendo (conectar via psql)
- [ ] API respondendo: `curl http://localhost/api/musicians/`
- [ ] Frontend acessível: https://gigflowagenda.com.br
- [ ] Funcionalidade de registro com campo cidade funcionando
- [ ] Perfil individual de músico mostrando cidade (`/musicos/:id`)
- [ ] Nenhum erro nos logs: `docker compose -f docker-compose.prod.yml logs --tail=100`

---

## 🎯 Comandos Rápidos

### Comandos Mais Usados

```bash
# Ver status
docker compose -f docker-compose.prod.yml ps

# Ver logs em tempo real
docker compose -f docker-compose.prod.yml logs -f

# Reiniciar tudo
docker compose -f docker-compose.prod.yml restart

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Subir tudo
docker compose -f docker-compose.prod.yml up -d

# Rebuild e subir
docker compose -f docker-compose.prod.yml up -d --build

# Entrar no backend (shell)
docker compose -f docker-compose.prod.yml exec backend sh

# Entrar no PostgreSQL (psql)
docker compose -f docker-compose.prod.yml exec db psql -U agenda -d agenda

# Ver migrations aplicadas
docker compose -f docker-compose.prod.yml exec backend python manage.py showmigrations

# Criar superusuário
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Limpar volumes e reiniciar (CUIDADO: apaga dados!)
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
```

---

## 📚 Referências

- [DEPLOY_POSTGRES.md](./DEPLOY_POSTGRES.md) - Detalhes de configuração PostgreSQL
- [INSTALL_DOCKER_SERVER.md](./INSTALL_DOCKER_SERVER.md) - Instalação Docker
- [DEV_LOCAL.md](./DEV_LOCAL.md) - Desenvolvimento local
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/15/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## 🚨 Notas Importantes

1. **Sempre faça backup antes de deploy em produção**
2. **Use `docker compose` (espaço) não `docker-compose` (hífen)**
3. **Migrations rodam automaticamente ao subir o backend**
4. **Volume `postgres_data` persiste dados entre restarts**
5. **Logs têm limite de 10MB por arquivo, máximo 3 arquivos**
6. **Rate limiting está ativo no Nginx (proteção contra abuso)**
7. **SSL/HTTPS gerenciado via Certbot (separado deste deploy)**

---

**Tudo pronto para deploy em produção!** 🚀
