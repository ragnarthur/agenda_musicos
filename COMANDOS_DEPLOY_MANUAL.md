# 🚀 Comandos de Deploy Manual - Campo State (UF)

## Passo a Passo no Servidor

### 1. SSH no Servidor

```bash
ssh arthur@srv1252721
cd /opt/agenda-musicos/agenda_musicos
```

### 2. Pull do Código

```bash
git pull origin main
```

**Esperado:**
```
From https://github.com/ragnarthur/agenda_musicos
   aff46a1..2d83378  main -> main
Updating aff46a1..2d83378
Fast-forward
 agenda/migrations/0024_add_state_to_musician.py | ...
 agenda/models.py                                 | ...
 agenda/serializers.py                            | ...
 frontend/src/pages/MusicianProfile.tsx           | ...
 frontend/src/pages/Register.tsx                  | ...
 frontend/src/services/api.ts                     | ...
 frontend/src/types/index.ts                      | ...
 8 files changed, 148 insertions(+), 53 deletions(-)
```

### 3. Rebuild Backend (com migrations)

```bash
docker compose -f docker-compose.prod.yml build backend --no-cache
```

**Tempo estimado:** 2-3 minutos

**Esperado ver:**
```
[+] Building 120.5s (15/15) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 1.2kB
 ...
 => exporting to image
 => => writing image sha256:...
```

### 4. Rebuild Frontend (com novo autocomplete)

```bash
docker compose -f docker-compose.prod.yml build frontend --no-cache
```

**Tempo estimado:** 2-3 minutos

**Esperado ver:**
```
[+] Building 95.3s (12/12) FINISHED
 => [internal] load build definition from Dockerfile
 ...
 => exporting to image
```

### 5. Restart dos Serviços

```bash
docker compose -f docker-compose.prod.yml up -d backend frontend
```

**Esperado:**
```
[+] Running 2/2
 ✔ Container agenda_musicos-backend-1   Started
 ✔ Container agenda_musicos-frontend-1  Started
```

### 6. Verificar Migrations Aplicadas

```bash
docker compose -f docker-compose.prod.yml logs backend | grep "0024_add_state_to_musician"
```

**Esperado:**
```
backend-1  |   Applying agenda.0024_add_state_to_musician... OK
```

### 7. Verificar Status dos Containers

```bash
docker compose -f docker-compose.prod.yml ps
```

**Esperado:**
```
NAME                              STATUS
agenda_musicos-db-1               Up
agenda_musicos-backend-1          Up
agenda_musicos-frontend-1         Up
agenda_musicos-payment-service-1  Up
agenda_musicos-nginx-1            Up
```

### 8. Verificar Banco de Dados (Opcional)

```bash
docker compose -f docker-compose.prod.yml exec db psql -U agenda -d agenda
```

Dentro do psql:
```sql
\d agenda_musician
```

**Esperado ver a coluna `state`:**
```
 state           | character varying(2) |
```

Sair do psql:
```sql
\q
```

---

## 🧪 Testes para Validar

### Teste 1: Autocomplete com Estado

1. Acesse: https://gigflowagenda.com.br/register
2. No campo "Cidade", digite: **São Paulo**
3. **Deve aparecer dropdown** mostrando:
   ```
   São Paulo          SP
   ```
4. Clique na cidade
5. **Campo deve mostrar:** `São Paulo - SP`

### Teste 2: Busca por Nome Composto

1. No campo "Cidade", digite: **Monte**
2. **Deve aparecer dropdown** mostrando:
   ```
   Monte Carmelo      MG
   Montes Claros      MG
   ```

### Teste 3: Busca por Segunda Palavra

1. No campo "Cidade", digite: **Carmelo**
2. **Deve aparecer dropdown** mostrando:
   ```
   Monte Carmelo      MG
   ```

### Teste 4: Perfil de Músico

1. Cadastre um novo músico (ou edite existente)
2. Selecione cidade com estado
3. Após cadastro, acesse o perfil
4. **Deve mostrar:** `São Paulo, SP` (com vírgula)

---

## 🔧 Troubleshooting

### Se migrations não aplicarem:

```bash
# Ver logs do backend
docker compose -f docker-compose.prod.yml logs backend | tail -100

# Aplicar manualmente (dentro do container)
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Verificar
docker compose -f docker-compose.prod.yml exec backend python manage.py showmigrations
```

### Se frontend não atualizar:

```bash
# Limpar cache e rebuild
docker compose -f docker-compose.prod.yml down frontend
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

### Se autocomplete não mostrar estados:

1. Limpar cache do navegador: `Ctrl+Shift+R` (ou `Cmd+Shift+R` no Mac)
2. Verificar logs do frontend:
   ```bash
   docker compose -f docker-compose.prod.yml logs frontend | tail -50
   ```

### Ver todos os logs em tempo real:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Para sair: `Ctrl+C`

---

## 📊 Resumo das Mudanças

### Backend
- ✅ Campo `state` adicionado ao modelo `Musician` (VARCHAR 2)
- ✅ Campo `state` adicionado ao modelo `PendingRegistration`
- ✅ Migration `0024_add_state_to_musician` criada
- ✅ Serializers atualizados

### Frontend
- ✅ 66 cidades brasileiras agora com UF
- ✅ Autocomplete mostra estado ao lado da cidade
- ✅ Input exibe "Cidade - UF" quando selecionado
- ✅ Perfil exibe "Cidade, UF"
- ✅ Busca por palavras individuais mantida

---

## ⏱️ Tempo Total Estimado

- Pull: 5 segundos
- Build backend: 2-3 minutos
- Build frontend: 2-3 minutos
- Restart: 10 segundos
- **Total: ~5-7 minutos**

---

## ✅ Checklist Final

- [ ] Git pull executado
- [ ] Backend rebuild concluído
- [ ] Frontend rebuild concluído
- [ ] Containers reiniciados
- [ ] Migration 0024 aplicada (verificar logs)
- [ ] Coluna `state` existe no banco
- [ ] Autocomplete mostra estados
- [ ] Seleção salva cidade e estado
- [ ] Perfil exibe "Cidade, UF"

---

**Pronto para deploy!** 🎉

Se encontrar qualquer problema, consulte a seção de Troubleshooting acima.
