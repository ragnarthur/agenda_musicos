# 🔧 Correção do Erro 502 Bad Gateway

## Problema Identificado

O erro **502 Bad Gateway** ocorre porque o container nginx está tentando conectar ao backend usando um **IP fixo antigo** (`172.18.0.3:8000`) ao invés de usar o **nome do serviço Docker** (`backend:8000`).

### Evidências do Problema

**Logs do Nginx:**
```
connect() failed (111: Connection refused) while connecting to upstream,
upstream: "http://172.18.0.3:8000/api/register/"
```

**Configuração Correta (deploy/nginx/default.conf):**
```nginx
upstream django_backend { server backend:8000; }
```

O problema é que o nginx está rodando com **configuração antiga em cache**.

---

## Solução: Rebuild do Nginx

### Opção 1: Script Automático (Recomendado)

```bash
# No servidor
cd /opt/agenda-musicos/agenda_musicos
chmod +x fix-502-nginx.sh
./fix-502-nginx.sh
```

### Opção 2: Comandos Manuais

```bash
# No servidor
cd /opt/agenda-musicos/agenda_musicos

# 1. Parar nginx
docker compose -f docker-compose.prod.yml stop nginx

# 2. Remover container antigo
docker compose -f docker-compose.prod.yml rm -f nginx

# 3. Recriar nginx
docker compose -f docker-compose.prod.yml up -d nginx

# 4. Verificar status
docker compose -f docker-compose.prod.yml ps

# 5. Ver logs
docker compose -f docker-compose.prod.yml logs nginx | tail -20
```

---

## Por Que Isso Funciona?

### Docker Compose Network Resolution

Em Docker Compose, os serviços na mesma rede (`internal`) se comunicam usando **nomes de serviços**, não IPs:

```yaml
# docker-compose.prod.yml
services:
  backend:
    expose:
      - "8000"
    networks:
      - internal

  nginx:
    networks:
      - internal
```

**Conexão correta:**
- Nginx → `backend:8000` ✅ (usa DNS interno do Docker)
- Nginx → `172.18.0.3:8000` ❌ (IP pode mudar a cada restart)

### Upstream Configurado

```nginx
upstream django_backend {
    server backend:8000;  # ✅ Nome do serviço
}

location ^~ /api/ {
    proxy_pass http://django_backend;
}
```

Quando o nginx resolve `backend:8000`, o Docker automaticamente:
1. Consulta o DNS interno da rede `internal`
2. Retorna o IP atual do container `backend`
3. Cria a conexão

---

## Verificação Pós-Correção

### 1. Verificar Containers

```bash
docker compose -f docker-compose.prod.yml ps
```

**Esperado:**
```
NAME                              STATUS
agenda_musicos-backend-1          Up
agenda_musicos-frontend-1         Up
agenda_musicos-nginx-1            Up (recém-criado)
```

### 2. Testar Conectividade Interna

```bash
# De dentro do nginx, testar conexão com backend
docker compose -f docker-compose.prod.yml exec nginx wget -O- http://backend:8000/healthz/
```

**Esperado:** Retorno JSON do Django healthcheck

### 3. Testar Externamente

```bash
curl -I https://gigflowagenda.com.br/api/musicians/me/
```

**Esperado:** `401 Unauthorized` (não mais 502)

### 4. Testar Cadastro

1. Acesse: https://gigflowagenda.com.br/cadastro
2. Preencha todas as 3 etapas do formulário
3. Clique em "Criar Conta"

**Esperado:**
- ✅ POST para `/api/register/` retorna **201 Created**
- ✅ Tela de sucesso aparece
- ❌ NÃO deve aparecer erro 502

---

## Logs para Diagnóstico

### Ver últimos erros do Nginx

```bash
docker compose -f docker-compose.prod.yml logs nginx | grep -i error | tail -20
```

**Se 502 CONTINUAR:**
```
[error] connect() failed (111: Connection refused) ... upstream: "http://172.18.0.3:8000"
```
→ Significa que o nginx ainda está com config antiga. Tente rebuild completo:

```bash
docker compose -f docker-compose.prod.yml down nginx
docker compose -f docker-compose.prod.yml up -d nginx
```

**Se RESOLVER:**
```
# Nenhum erro de "Connection refused"
# Apenas logs normais de requisições
```

### Ver status do Backend

```bash
docker compose -f docker-compose.prod.yml logs backend | tail -30
```

**Esperado:**
```
[INFO] Starting gunicorn 21.2.0
[INFO] Listening at: http://0.0.0.0:8000
[INFO] Booting worker with pid: 9
```

### Testar Resolução de DNS

```bash
# De dentro do nginx, verificar se resolve "backend"
docker compose -f docker-compose.prod.yml exec nginx nslookup backend
```

**Esperado:**
```
Server:    127.0.0.11
Address:   127.0.0.11:53

Name:      backend
Address:   172.18.0.X  (qualquer IP da rede interna)
```

---

## Troubleshooting Avançado

### Se Nada Funcionar

#### 1. Rebuild Completo de Todos os Containers

```bash
cd /opt/agenda-musicos/agenda_musicos

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Recriar network
docker network prune -f

# Subir novamente
docker compose -f docker-compose.prod.yml up -d

# Verificar
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs nginx | tail -20
```

#### 2. Verificar Arquivo de Configuração no Container

```bash
# Ver configuração que o nginx está REALMENTE usando
docker compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/conf.d/default.conf | grep -A 1 "upstream django_backend"
```

**Deve mostrar:**
```nginx
upstream django_backend { server backend:8000; }
```

**Se mostrar IP fixo (172.18.0.X), a config antiga ainda está lá!**

#### 3. Forçar Rebuild do Nginx

```bash
# Parar e remover
docker compose -f docker-compose.prod.yml stop nginx
docker compose -f docker-compose.prod.yml rm -f nginx

# Remover volumes órfãos
docker volume prune -f

# Recriar com --force-recreate
docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
```

---

## Resumo da Correção

| Item | Status Antes | Status Depois |
|------|--------------|---------------|
| **Upstream** | `172.18.0.3:8000` (IP fixo) | `backend:8000` (nome serviço) |
| **Conexão** | ❌ Connection refused | ✅ OK |
| **Erro 502** | ❌ Sim | ✅ Não |
| **Cadastro** | ❌ Falha | ✅ Funciona |

---

## Prevenção Futura

Para evitar esse problema no futuro:

1. **Sempre use nomes de serviços** no nginx upstream, nunca IPs fixos
2. **Após mudanças no nginx**, sempre faça `rm -f nginx` antes de `up -d`
3. **Em caso de dúvida**, faça `down` completo e `up -d` para recriar toda a rede

---

## Checklist de Validação

Após executar a correção, verifique:

- [ ] Container nginx foi recriado (não apenas reiniciado)
- [ ] Logs do nginx NÃO mostram "172.18.0.3" ou "Connection refused"
- [ ] `curl https://gigflowagenda.com.br/api/musicians/me/` retorna 401 (não 502)
- [ ] Cadastro completo funciona (3 etapas + submit)
- [ ] POST para `/api/register/` retorna 201 Created
- [ ] Tela de sucesso aparece após cadastro

---

## Tempo Estimado

- **Opção 1 (Script):** 30 segundos
- **Opção 2 (Manual):** 1-2 minutos
- **Rebuild completo (se necessário):** 2-3 minutos

---

**Pronto para executar!** 🚀

Qualquer dúvida, consulte os logs:
```bash
docker compose -f docker-compose.prod.yml logs --follow
```
