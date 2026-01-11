# Deploy - Quick Start Guide

## 🚀 Deploy Inicial (Primeira Vez)

### 1. Instalar Docker (se ainda não tem)

```bash
cd /opt/agenda-musicos/agenda_musicos
bash install-docker.sh
exit  # Logout e login novamente
```

### 2. Deploy Completo

```bash
cd /opt/agenda-musicos/agenda_musicos
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### 3. Verificar

```bash
# Ver status
docker compose -f docker-compose.prod.yml ps

# Ver migrations (deve mostrar 0023_add_city_to_musician)
docker compose -f docker-compose.prod.yml logs backend | grep migrate

# Testar API
curl http://localhost/api/musicians/
```

**Pronto!** Acesse: https://gigflowagenda.com.br

---

## 🔄 Deploy de Atualização (Updates)

### Código Mudou (backend ou frontend)

```bash
cd /opt/agenda-musicos/agenda_musicos
git pull origin main
docker compose -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.prod.yml up -d
```

### Apenas Migrations Novas

```bash
cd /opt/agenda-musicos/agenda_musicos
git pull origin main
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml logs backend | grep migrate
```

### Rebuild Completo (tudo do zero)

```bash
cd /opt/agenda-musicos/agenda_musicos
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

---

## 🛠️ Comandos Úteis

### Ver Logs

```bash
# Todos os serviços
docker compose -f docker-compose.prod.yml logs -f

# Apenas backend
docker compose -f docker-compose.prod.yml logs -f backend

# Últimas 100 linhas
docker compose -f docker-compose.prod.yml logs --tail=100
```

### Reiniciar

```bash
# Tudo
docker compose -f docker-compose.prod.yml restart

# Apenas backend
docker compose -f docker-compose.prod.yml restart backend
```

### Entrar nos Containers

```bash
# Backend (shell)
docker compose -f docker-compose.prod.yml exec backend sh

# PostgreSQL (psql)
docker compose -f docker-compose.prod.yml exec db psql -U agenda -d agenda

# Ver migrations aplicadas
docker compose -f docker-compose.prod.yml exec backend python manage.py showmigrations
```

### Backup

```bash
# Criar backup
docker compose -f docker-compose.prod.yml exec db pg_dump -U agenda agenda | gzip > backup_$(date +%Y%m%d).sql.gz

# Restaurar backup
zcat backup_20260111.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U agenda -d agenda
```

---

## 🔍 Troubleshooting Rápido

### Container não sobe

```bash
docker compose -f docker-compose.prod.yml logs [nome-servico]
docker compose -f docker-compose.prod.yml up -d --force-recreate [nome-servico]
```

### Migrations não aplicaram

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose -f docker-compose.prod.yml exec backend python manage.py showmigrations
```

### Nginx retorna 502

```bash
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml logs backend | tail -50
```

### Verificar se PostgreSQL está OK

```bash
docker compose -f docker-compose.prod.yml exec db psql -U agenda -d agenda -c "\dt"
```

---

## ✅ Checklist Mínimo

- [ ] Git pull feito
- [ ] Build sem erros
- [ ] Containers rodando (`docker compose ps`)
- [ ] Migrations OK (verificar logs)
- [ ] API responde (`curl http://localhost/api/musicians/`)
- [ ] Frontend acessível (https://gigflowagenda.com.br)

---

**Para detalhes completos, veja:** [DEPLOY_RUNBOOK.md](./DEPLOY_RUNBOOK.md)
