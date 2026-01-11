# 🔍 Deploy - Melhoria na Busca de Cidades

## ✅ O Que Foi Implementado

Busca inteligente por **palavras individuais** no autocomplete de cidades.

### Antes (busca simples)
- Digitando "Carmelo" → **NÃO** encontrava "Monte Carmelo"
- Apenas substrings contínuas funcionavam

### Depois (busca por palavras)
- Digitando "Monte" → Encontra "Monte Carmelo", "Montes Claros"
- Digitando "Carmelo" → Encontra "Monte Carmelo" ✅
- Digitando "Belo" → Encontra "Belo Horizonte"
- Digitando "Horizonte" → Encontra "Belo Horizonte" ✅
- Digitando "são pa" → Encontra "São Paulo" ✅

### Novas Cidades Adicionadas (8)

Cidades com nomes compostos para melhor teste:
- Monte Carmelo
- Santa Rita do Sapucaí
- Barra do Garças
- Santa Maria
- Ponta Grossa
- Foz do Iguaçu
- Praia Grande
- Governador Valadares

Agora temos **63 cidades brasileiras** no total.

---

## 🚀 Deploy no Servidor

### SSH no Servidor

```bash
ssh arthur@srv1252721
cd /opt/agenda-musicos/agenda_musicos
```

### Executar Deploy

**Opção 1: Script Automatizado**

```bash
git pull origin main
bash SERVER_DEPLOY_NOW.sh
```

**Opção 2: Comandos Manuais**

```bash
# Pull do código
git pull origin main

# Rebuild frontend
docker compose -f docker-compose.prod.yml build frontend --no-cache

# Restart frontend
docker compose -f docker-compose.prod.yml up -d frontend

# Verificar
docker compose -f docker-compose.prod.yml ps frontend
```

---

## 🧪 Testes para Validar

Após o deploy, acesse: https://gigflowagenda.com.br/register

### Testes de Nomes Compostos (NOVOS)

1. **Digite "Monte"**
   - ✅ Deve encontrar: "Monte Carmelo", "Montes Claros"

2. **Digite "Carmelo"**
   - ✅ Deve encontrar: "Monte Carmelo"

3. **Digite "Belo"**
   - ✅ Deve encontrar: "Belo Horizonte"

4. **Digite "Horizonte"**
   - ✅ Deve encontrar: "Belo Horizonte"

5. **Digite "Santa"**
   - ✅ Deve encontrar: "Santa Maria", "Santa Rita do Sapucaí", "Santo André", "Santos", "Feira de Santana"

6. **Digite "Rita"**
   - ✅ Deve encontrar: "Santa Rita do Sapucaí"

7. **Digite "Governador"**
   - ✅ Deve encontrar: "Governador Valadares"

8. **Digite "Valadares"**
   - ✅ Deve encontrar: "Governador Valadares"

9. **Digite "Foz"**
   - ✅ Deve encontrar: "Foz do Iguaçu"

10. **Digite "Iguaçu"**
    - ✅ Deve encontrar: "Foz do Iguaçu"

### Testes de Múltiplas Palavras (NOVOS)

11. **Digite "são pa"**
    - ✅ Deve encontrar: "São Paulo"

12. **Digite "belo ho"**
    - ✅ Deve encontrar: "Belo Horizonte"

13. **Digite "rio jan"**
    - ✅ Deve encontrar: "Rio de Janeiro"

14. **Digite "monte car"**
    - ✅ Deve encontrar: "Monte Carmelo"

15. **Digite "santa rita"**
    - ✅ Deve encontrar: "Santa Rita do Sapucaí"

### Testes de Prefixos (NOVOS)

16. **Digite "Gov"**
    - ✅ Deve encontrar: "Governador Valadares", "Aparecida de Goiânia"

17. **Digite "Pon"**
    - ✅ Deve encontrar: "Ponta Grossa"

18. **Digite "Bar"**
    - ✅ Deve encontrar: "Barra do Garças", "Bauru"

### Testes Básicos (Verificar que ainda funcionam)

19. **Digite "São"**
    - ✅ Deve encontrar: "São Paulo", "São Luís", "São Gonçalo", "São Bernardo do Campo", "São João de Meriti", "São José dos Campos"

20. **Digite "Porto"**
    - ✅ Deve encontrar: "Porto Alegre", "Porto Velho"

21. **Digite "Campo"**
    - ✅ Deve encontrar: "Campo Grande", "São Bernardo do Campo", "São José dos Campos"

### Testes Negativos

22. **Digite "xyz"**
    - ✅ Não deve encontrar nenhuma cidade
    - ✅ Deve mostrar mensagem: "Nenhuma cidade encontrada"

23. **Digite "aaa bbb"**
    - ✅ Não deve encontrar nenhuma cidade

---

## 🔍 Como Funciona o Novo Algoritmo

### Algoritmo de Busca por Palavras

```typescript
const handleCityChange = (value: string) => {
  // Divide o input em palavras
  const searchWords = value.toLowerCase().trim().split(/\s+/);

  const filtered = BRAZILIAN_CITIES.filter(city => {
    // Divide o nome da cidade em palavras (por espaços e hífens)
    const cityWords = city.toLowerCase().split(/[\s-]+/);

    // Cada palavra do input deve corresponder a pelo menos uma palavra da cidade
    return searchWords.every(searchWord =>
      cityWords.some(cityWord => cityWord.includes(searchWord))
    );
  });
};
```

### Exemplos de Funcionamento

**Exemplo 1: "Monte Carmelo"**
- Input: "Monte"
- `searchWords = ["monte"]`
- Cidade: "Monte Carmelo" → `cityWords = ["monte", "carmelo"]`
- Verifica: "monte" está em ["monte", "carmelo"]? **SIM** ✅

**Exemplo 2: "Monte Carmelo" (por segunda palavra)**
- Input: "Carmelo"
- `searchWords = ["carmelo"]`
- Cidade: "Monte Carmelo" → `cityWords = ["monte", "carmelo"]`
- Verifica: "carmelo" está em ["monte", "carmelo"]? **SIM** ✅

**Exemplo 3: Busca com múltiplas palavras**
- Input: "são pa"
- `searchWords = ["são", "pa"]`
- Cidade: "São Paulo" → `cityWords = ["são", "paulo"]`
- Verifica:
  - "são" está em ["são", "paulo"]? **SIM** ✅
  - "pa" está em ["são", "paulo"]? **SIM** (substring de "paulo") ✅

**Exemplo 4: Prefixo de palavra**
- Input: "Gov"
- `searchWords = ["gov"]`
- Cidade: "Governador Valadares" → `cityWords = ["governador", "valadares"]`
- Verifica: "gov" está em ["governador", "valadares"]? **SIM** (substring de "governador") ✅

---

## ✅ Benefícios

✅ **Busca por qualquer palavra** - "Carmelo" encontra "Monte Carmelo"
✅ **Busca por prefixos** - "Gov" encontra "Governador Valadares"
✅ **Busca com múltiplas palavras** - "são pa" encontra "São Paulo"
✅ **Suporta hífens** - "Foz-do-Iguaçu" seria tratado como palavras separadas
✅ **Case-insensitive** - "MONTE" = "monte" = "Monte"
✅ **Simples e performático** - Sem dependências externas
✅ **Permite texto livre** - Usuário pode digitar qualquer cidade, não está restrito à lista

---

## 📊 Estatísticas

- **Antes**: 55 cidades
- **Depois**: 63 cidades (+8 novas)
- **Cidades com nomes compostos**: 31 (49% do total)
- **Palavras únicas**: ~70 palavras

---

## 🔧 Troubleshooting

### Se a busca não funcionar como esperado:

1. **Limpar cache do navegador**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

2. **Verificar se o frontend foi atualizado**
   ```bash
   docker compose -f docker-compose.prod.yml logs frontend | tail -50
   ```

3. **Forçar rebuild completo**
   ```bash
   docker compose -f docker-compose.prod.yml down frontend
   docker compose -f docker-compose.prod.yml build --no-cache frontend
   docker compose -f docker-compose.prod.yml up -d frontend
   ```

---

## 📝 Commit

**Commit ID**: `8dbb0c1`
**Branch**: `main`
**Arquivo modificado**: `frontend/src/pages/Register.tsx`

---

## ⏱️ Tempo Estimado de Deploy

- Git pull: 5 segundos
- Build frontend: 3-5 minutos
- Restart container: 10 segundos
- **Total**: ~5 minutos

---

**Pronto para deploy!** 🚀

Basta executar `bash SERVER_DEPLOY_NOW.sh` no servidor.
