# ⚡ Executar Deploy no Servidor AGORA

## 🎯 Mudança Implementada

Campo de **cidade** agora tem **autocomplete dinâmico e visível**:
- ✅ Dropdown aparece enquanto você digita
- ✅ Mostra até 10 cidades filtradas
- ✅ Contador de quantas cidades encontrou
- ✅ Clique para selecionar
- ✅ Permite digitar texto livre (não está restrito à lista)

---

## 🚀 Comandos para Executar no Servidor

### SSH no Servidor

```bash
ssh arthur@srv1252721
cd /opt/agenda-musicos/agenda_musicos
```

### Opção 1: Usando o Script Automatizado (Recomendado)

```bash
git pull origin main
bash SERVER_DEPLOY_NOW.sh
```

O script faz automaticamente:
1. ✅ Git pull
2. ✅ Rebuild do frontend
3. ✅ Restart do container frontend
4. ✅ Verificação de status
5. ✅ Mostra logs

### Opção 2: Comandos Manuais

```bash
# 1. Pull do código
git pull origin main

# 2. Rebuild do frontend
docker compose -f docker-compose.prod.yml build frontend --no-cache

# 3. Restart do frontend
docker compose -f docker-compose.prod.yml up -d frontend

# 4. Verificar status
docker compose -f docker-compose.prod.yml ps

# 5. Ver logs (opcional)
docker compose -f docker-compose.prod.yml logs --tail=50 frontend
```

---

## ✅ Verificação

### 1. Container Rodando

```bash
docker compose -f docker-compose.prod.yml ps frontend
```

**Esperado**: `STATUS = Up`

### 2. Testar no Navegador

Acesse: https://gigflowagenda.com.br/register

**Teste:**
1. No campo "Cidade", comece a digitar "São"
2. Deve aparecer um **dropdown visível** com cidades como:
   - São Paulo
   - São Luís
   - São Gonçalo
   - São Bernardo do Campo
   - etc.
3. Clique em uma cidade para selecionar
4. O dropdown fecha automaticamente

**Teste 2:**
1. Digite "Bel"
2. Deve mostrar:
   - Belo Horizonte
   - Belém
   - Betim

---

## 📊 Status do Deploy

### O que foi alterado:

**Arquivo modificado:**
- `src/pages/Register.tsx` - Autocomplete dinâmico de cidades

**Commits enviados:**
1. ✅ Documentação de deployment (commit anterior)
2. ✅ Autocomplete dinâmico de cidades (commit fc17fca)
3. ✅ Script de deploy (commit a508b0f)

### O que NÃO foi alterado:

- ❌ Backend (nenhuma migration nova)
- ❌ Database (estrutura já tem campo city)
- ❌ Nginx (configuração não mudou)
- ❌ Outros serviços (PostgreSQL, Payment Service)

**Por isso:** Só precisa fazer rebuild do **frontend**!

---

## 🔍 Troubleshooting

### Se o dropdown não aparecer:

1. **Limpar cache do navegador:**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

2. **Verificar logs do frontend:**
   ```bash
   docker compose -f docker-compose.prod.yml logs frontend | tail -50
   ```

3. **Forçar rebuild completo:**
   ```bash
   docker compose -f docker-compose.prod.yml down frontend
   docker compose -f docker-compose.prod.yml build --no-cache frontend
   docker compose -f docker-compose.prod.yml up -d frontend
   ```

### Se container não sobe:

```bash
# Ver erro específico
docker compose -f docker-compose.prod.yml logs frontend

# Rebuild e restart
docker compose -f docker-compose.prod.yml up -d --force-recreate frontend
```

---

## 🎉 Pronto!

Após executar o deploy, o autocomplete de cidades estará funcionando com dropdown visível.

**Tempo estimado do deploy:** 3-5 minutos

**Antes:**
- Datalist HTML5 (invisível, difícil de usar)

**Depois:**
- Dropdown dinâmico e visível
- Filtra enquanto digita
- Mostra contador de resultados
- UX muito melhor! ✨
