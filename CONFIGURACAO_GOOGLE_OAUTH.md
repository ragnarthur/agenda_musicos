# Configuração Google OAuth - Instruções Permanentes

## Problema Identificado (29/01/2026)

O botão "Cadastrar com Google" estava invisível em produção porque a variável `VITE_GOOGLE_CLIENT_ID` não estava configurada no servidor.

## Arquivos que Precisam Estar Configurados

⚠️ **IMPORTANTE:** Há **DOIS** arquivos `.env` diferentes com funções distintas:

### Diferença entre `.env` e `.env.docker`

| Arquivo | Localização | Função | Usado por |
|---------|-------------|--------|-----------|
| `.env` | `/opt/agenda-musicos/` | Substituir variáveis `${VAR}` no docker-compose.yml | Docker Compose |
| `.env.docker` | `/opt/agenda-musicos/agenda_musicos/` | Passar variáveis para dentro dos containers | Containers (via `env_file`) |

### 1. `.env` (Para Docker Compose)

**Localização:** `/opt/agenda-musicos/.env`

Este arquivo é lido pelo Docker Compose para substituir variáveis no `docker-compose.yml`:

```env
# Docker Compose environment variables
VITE_API_URL=/api
VITE_GOOGLE_CLIENT_ID=seu-google-client-id.apps.googleusercontent.com
POSTGRES_DB=agenda
POSTGRES_USER=agenda
POSTGRES_PASSWORD=sua-senha-postgres
```

### 2. `.env.docker` (Para os Containers)

**Localização:** `/opt/agenda-musicos/agenda_musicos/.env.docker`

Adicionar na seção **Google OAuth**:

```env
# =========================
# Google OAuth
# =========================
GOOGLE_CLIENT_ID=seu-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-google-client-secret
VITE_GOOGLE_CLIENT_ID=seu-google-client-id.apps.googleusercontent.com
```

⚠️ **IMPORTANTE:** Substitua `seu-google-client-id` e `seu-google-client-secret` pelos valores reais do seu projeto Google Cloud.

**IMPORTANTE:**
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` são usados pelo **backend** Django
- `VITE_GOOGLE_CLIENT_ID` é usado pelo **frontend** React/Vite

### 2. `docker-compose.prod.yml`

**Localização:** `/opt/agenda-musicos/docker-compose.prod.yml`

O serviço `frontend` deve ter:

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:
      VITE_API_URL: ${VITE_API_URL:-/api}
      VITE_GOOGLE_CLIENT_ID: ${VITE_GOOGLE_CLIENT_ID}
```

**IMPORTANTE:** A linha `VITE_GOOGLE_CLIENT_ID: ${VITE_GOOGLE_CLIENT_ID}` é essencial porque:
- Variáveis VITE_* precisam ser passadas como **build args**
- Elas são compiladas no código JavaScript durante o build
- Não podem ser alteradas em runtime

### 3. `frontend/Dockerfile`

**Localização:** `/opt/agenda-musicos/agenda_musicos/frontend/Dockerfile`

Deve conter:

```dockerfile
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
```

(Este arquivo já está correto no repositório)

## Como Aplicar Mudanças em Produção

### Passo 1: Conectar ao Servidor

```bash
ssh arthur@181.215.134.53
cd /opt/agenda-musicos/agenda_musicos
```

### Passo 2: Fazer Backup do .env.docker

```bash
sudo cp .env.docker .env.docker.backup-$(date +%Y%m%d_%H%M%S)
```

### Passo 3: Adicionar VITE_GOOGLE_CLIENT_ID

```bash
sudo nano .env.docker
```

Adicionar na seção Google OAuth:
```
VITE_GOOGLE_CLIENT_ID=seu-google-client-id.apps.googleusercontent.com
```

⚠️ Use o mesmo valor do `GOOGLE_CLIENT_ID`.

### Passo 4: Atualizar docker-compose.prod.yml

```bash
cd /opt/agenda-musicos
sudo nano docker-compose.prod.yml
```

Adicionar em `frontend.build.args`:
```yaml
VITE_GOOGLE_CLIENT_ID: ${VITE_GOOGLE_CLIENT_ID}
```

### Passo 5: Rebuild do Frontend

⚠️ **IMPORTANTE:** Como VITE_* é uma variável de build-time, é necessário fazer rebuild do container:

```bash
cd /opt/agenda-musicos
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

### Passo 6: Verificar Logs

```bash
docker compose -f docker-compose.prod.yml logs -f frontend
```

## Verificação em Produção

1. Acessar https://gigflowagenda.com.br/solicitar-acesso
2. Abrir DevTools (F12) → Console
3. **NÃO deve aparecer:** `VITE_GOOGLE_CLIENT_ID não configurado`
4. **Deve aparecer:** Botão "Continuar com Google" visível

## Checklist de Deploy

Sempre que fizer deploy ou rebuild do frontend:

- [ ] `.env.docker` contém `VITE_GOOGLE_CLIENT_ID`
- [ ] `docker-compose.prod.yml` passa `VITE_GOOGLE_CLIENT_ID` como build arg
- [ ] Frontend foi rebuild após mudanças no `.env.docker`
- [ ] Botão Google está visível em todas as páginas:
  - [ ] `/login`
  - [ ] `/login-empresa`
  - [ ] `/solicitar-acesso`
  - [ ] `/cadastro-empresa`
  - [ ] `/register-invite`

## Troubleshooting

### Botão ainda não aparece após rebuild

1. Verificar se `.env.docker` foi salvo corretamente:
   ```bash
   grep VITE_GOOGLE_CLIENT_ID /opt/agenda-musicos/agenda_musicos/.env.docker
   ```

2. Verificar se docker-compose.prod.yml está correto:
   ```bash
   grep -A5 "frontend:" /opt/agenda-musicos/docker-compose.prod.yml | grep VITE_GOOGLE_CLIENT_ID
   ```

3. Forçar rebuild completo:
   ```bash
   docker compose -f docker-compose.prod.yml down frontend
   docker compose -f docker-compose.prod.yml build --no-cache frontend
   docker compose -f docker-compose.prod.yml up -d frontend
   ```

4. Limpar cache do browser (Ctrl+Shift+R ou Cmd+Shift+R)

### Warning no console sobre variável não configurada

Se aparecer `VITE_GOOGLE_CLIENT_ID não configurado`, significa que:
- O frontend foi buildado SEM a variável
- Precisa fazer rebuild do container frontend

## Scripts de Manutenção

### Script de Verificação

Criar arquivo `check-google-oauth.sh`:

```bash
#!/bin/bash
echo "=== Verificando configuração Google OAuth ==="
echo ""
echo "1. Checando .env.docker:"
grep -E "VITE_GOOGLE_CLIENT_ID|GOOGLE_CLIENT_ID" /opt/agenda-musicos/agenda_musicos/.env.docker
echo ""
echo "2. Checando docker-compose.prod.yml:"
grep -A5 "frontend:" /opt/agenda-musicos/docker-compose.prod.yml | grep VITE_GOOGLE_CLIENT_ID
echo ""
echo "3. Checando container frontend:"
docker compose -f /opt/agenda-musicos/docker-compose.prod.yml ps frontend
```

Usar:
```bash
chmod +x check-google-oauth.sh
./check-google-oauth.sh
```

## Alterações Feitas no Servidor (29/01/2026)

### Resumo das Mudanças

✅ **Todas as configurações foram aplicadas com sucesso!**

1. **Arquivo `.env` criado em `/opt/agenda-musicos/`**
   - Contém variáveis para Docker Compose substituir no docker-compose.yml
   - Inclui `VITE_GOOGLE_CLIENT_ID`

2. **Arquivo `.env.docker` atualizado em `/opt/agenda-musicos/agenda_musicos/`**
   - Adicionado `VITE_GOOGLE_CLIENT_ID` na seção Google OAuth
   - Usado pelos containers via `env_file`

3. **Arquivo `docker-compose.prod.yml` corrigido em `/opt/agenda-musicos/`**
   - Adicionado `VITE_GOOGLE_CLIENT_ID: ${VITE_GOOGLE_CLIENT_ID}` nos build args do frontend
   - Corrigido paths dos contexts:
     - Backend: `./agenda_musicos`
     - Frontend: `./agenda_musicos/frontend`
     - Payment: `./agenda_musicos/payment-service`

4. **Container frontend rebuilt e reiniciado**
   - Build executado com sucesso (sem cache)
   - Container rodando normalmente

### Arquivos de Backup Criados

Todos os arquivos foram backupeados antes das alterações:

```bash
/opt/agenda-musicos/.env.docker.backup
/opt/agenda-musicos/agenda_musicos/.env.docker.backup-20260129_214431
/opt/agenda-musicos/docker-compose.prod.yml.backup-20260129_214431
```

### Verificação Final

Para verificar se tudo está funcionando:

1. **Acessar:** https://gigflowagenda.com.br/solicitar-acesso
2. **Abrir DevTools (F12)** → Console
3. **Verificar:**
   - ✅ Botão "Continuar com Google" deve estar visível
   - ✅ NÃO deve aparecer warning: `VITE_GOOGLE_CLIENT_ID não configurado`
   - ✅ Botão deve estar funcional ao clicar

### Comandos para Manutenção Futura

#### Verificar configuração atual:
```bash
# Verificar .env
cat /opt/agenda-musicos/.env | grep VITE_GOOGLE_CLIENT_ID

# Verificar .env.docker
cat /opt/agenda-musicos/agenda_musicos/.env.docker | grep VITE_GOOGLE_CLIENT_ID

# Verificar docker-compose.prod.yml
cat /opt/agenda-musicos/docker-compose.prod.yml | grep -A2 "args:"

# Verificar status do container
docker compose -f /opt/agenda-musicos/docker-compose.prod.yml ps frontend
```

#### Rebuild completo (se necessário):
```bash
cd /opt/agenda-musicos
docker compose -f docker-compose.prod.yml down frontend
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

## Notas de Segurança

- O Google Client ID é **público** (não é segredo)
- Ele aparece no código JavaScript do frontend
- O Client Secret (`GOOGLE_CLIENT_SECRET`) é usado apenas no backend Django
- NUNCA expor Client Secret no frontend

## Referências

- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- Vite Environment Variables: https://vitejs.dev/guide/env-and-mode.html
- Docker Build Args: https://docs.docker.com/compose/compose-file/build/
- Docker Compose Environment Variables: https://docs.docker.com/compose/environment-variables/

---

**Documento criado em:** 29/01/2026
**Última atualização:** 29/01/2026 23:48 BRT
**Responsável:** Arthur Araujo
**Status:** ✅ Configurações aplicadas e testadas com sucesso
