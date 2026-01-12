# 🚀 Deploy do Formulário Multi-Step

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
   d660eb6..8c32aa1  main -> main
Updating d660eb6..8c32aa1
Fast-forward
 frontend/src/components/Registration/AccountStep.tsx        | ...
 frontend/src/components/Registration/MusicProfileStep.tsx   | ...
 frontend/src/components/Registration/PersonalInfoStep.tsx   | ...
 frontend/src/components/Registration/ProgressIndicator.tsx  | ...
 frontend/src/components/Registration/StepNavigation.tsx     | ...
 frontend/src/pages/Register.tsx                             | ...
 6 files changed, 1029 insertions(+), 572 deletions(-)
```

### 3. Rebuild Frontend

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

### 4. Restart do Frontend

```bash
docker compose -f docker-compose.prod.yml up -d frontend
```

**Esperado:**
```
[+] Running 1/1
 ✔ Container agenda_musicos-frontend-1  Started
```

### 5. Verificar Status

```bash
docker compose -f docker-compose.prod.yml ps
```

**Esperado:**
```
NAME                              STATUS
agenda_musicos-frontend-1         Up
```

---

## 🧪 Testes para Validar

### Teste 1: Visualizar Formulário Multi-Step

1. Acesse: https://gigflowagenda.com.br/cadastro
2. **Deve ver:**
   - Indicador de progresso no topo (1 de 3)
   - Título "Segurança da Conta"
   - Apenas 4 campos: Email, Username, Senha, Confirmar Senha
   - Botão "Próximo" (sem botão "Voltar" na etapa 1)

### Teste 2: Navegação Entre Etapas

1. Preencha os campos da Etapa 1
2. Clique em "Próximo"
3. **Deve ver:**
   - Indicador de progresso mudou para 2 de 3
   - Título "Informações Pessoais"
   - Campos: Nome, Sobrenome, Telefone, Cidade
   - Botões "Voltar" e "Próximo"
4. Clique em "Voltar"
5. **Deve voltar** para Etapa 1 com dados preservados

### Teste 3: Validação por Etapa

1. Na Etapa 1, deixe campos vazios
2. Clique em "Próximo"
3. **Deve exibir** erros de validação
4. **Não deve avançar** para próxima etapa

### Teste 4: Password Strength

1. Na Etapa 1, digite senha fraca (ex: "123")
2. **Deve ver:**
   - Barra de força da senha vermelha
   - Indicador "Muito fraca"
   - Checklist de requisitos

### Teste 5: Autocomplete de Cidade

1. Avance para Etapa 2
2. Digite "São Paulo" no campo Cidade
3. **Deve ver:**
   - Dropdown com "São Paulo - SP"
4. Selecione a cidade
5. **Deve preencher** "São Paulo - SP" no campo

### Teste 6: Perfil Musical

1. Avance para Etapa 3
2. **Deve ver:**
   - Título "Perfil Musical"
   - Toggle "Você é multi-instrumentista?"
   - Seleção de instrumentos
   - Campo de bio
   - Botões "Voltar" e "Criar Conta"

### Teste 7: Submissão Final

1. Preencha todas as 3 etapas
2. Clique em "Criar Conta" na Etapa 3
3. **Deve:**
   - Mostrar spinner "Criando conta..."
   - Exibir tela de sucesso
   - Pedir verificação de email

### Teste 8: Mobile Responsiveness

1. Acesse pelo celular ou redimensione navegador
2. **Deve ver:**
   - Indicador de progresso legível
   - Campos em coluna única
   - Botões acessíveis

---

## 🔧 Troubleshooting

### Se frontend não atualizar:

```bash
# Limpar cache e rebuild
docker compose -f docker-compose.prod.yml down frontend
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

### Ver logs do frontend:

```bash
docker compose -f docker-compose.prod.yml logs frontend | tail -50
```

### Limpar cache do navegador:

1. `Ctrl+Shift+R` (ou `Cmd+Shift+R` no Mac)
2. Ou abra em aba anônima para testar

### Ver todos os logs em tempo real:

```bash
docker compose -f docker-compose.prod.yml logs -f frontend
```

Para sair: `Ctrl+C`

---

## 📊 Resumo das Mudanças

### Componentes Novos

1. **ProgressIndicator.tsx** - Indicador visual de progresso (1 de 3, 2 de 3, etc)
2. **StepNavigation.tsx** - Botões de navegação (Voltar/Próximo/Criar Conta)
3. **AccountStep.tsx** - Etapa 1: Email, username, senhas
4. **PersonalInfoStep.tsx** - Etapa 2: Nome, telefone, cidade
5. **MusicProfileStep.tsx** - Etapa 3: Instrumentos, bio

### Funcionalidades Preservadas

- ✅ Validação de senha forte com indicador visual
- ✅ Autocomplete de cidades com UF
- ✅ Máscara de telefone
- ✅ Multi-instrumentista
- ✅ Tela de sucesso com verificação de email
- ✅ Todas as integrações com API

### Melhorias de UX

- ✅ Formulário dividido em 3 etapas lógicas
- ✅ Indicador de progresso visual
- ✅ Validação por etapa (não avança com erros)
- ✅ Dados preservados ao navegar
- ✅ Melhor experiência em mobile
- ✅ Menos sobrecarga cognitiva

---

## ⏱️ Tempo Total Estimado

- Pull: 5 segundos
- Build frontend: 2-3 minutos
- Restart: 5 segundos
- **Total: ~3-4 minutos**

---

## ✅ Checklist Final

- [ ] Git pull executado
- [ ] Frontend rebuild concluído
- [ ] Container reiniciado
- [ ] Formulário em 3 etapas aparece
- [ ] Indicador de progresso funciona
- [ ] Navegação Voltar/Próximo funciona
- [ ] Validação por etapa funciona
- [ ] Senha forte validada
- [ ] Autocomplete cidade funciona
- [ ] Submit final funciona

---

**Pronto para usar!** 🎉

Se encontrar qualquer problema, consulte a seção de Troubleshooting acima.
