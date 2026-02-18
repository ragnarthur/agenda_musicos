# 🔧 Correção do Webhook do Telegram Bot

## Problema Identificado

O webhook do Telegram está retornando erro **401 Unauthorized** porque:

1. O `TELEGRAM_WEBHOOK_SECRET` está configurado no `.env.docker`
2. O webhook foi configurado **SEM** esse segredo no Telegram
3. O backend rejeita requisições que não enviam o header `X-Telegram-Bot-Api-Secret-Token`

## Solução

Você tem **duas opções**:

---

## ✅ Opção 1: Reconfigurar Webhook com Segredo (RECOMENDADO)

Esta opção mantém a proteção extra do webhook.

### Passo 1: Fazer deploy das mudanças do código

```bash
# No servidor de produção:
cd /caminho/para/agenda-musicos

# Fazer pull das mudanças mais recentes
git pull origin main

# Reiniciar o backend
docker-compose -f docker-compose.prod.yml restart backend

# OU se não usar docker-compose:
sudo systemctl restart gunicorn
```

### Passo 2: Reconfigurar o webhook com o segredo

```bash
# No servidor de produção:
python manage.py setup_telegram_bot \
  --webhook-url https://gigflowagenda.com.br/api/notifications/telegram/webhook/ \
  --secret gigflow_webhook_secret_2024_secure_token_change_this
```

### Passo 3: Verificar se funcionou

```bash
# Verificar informações do bot
curl -X GET "https://api.telegram.org/bot8117130143:AAFArCYBhEKZRDYgMYBaxQZJs9N09BvCrVw/getMe" | python3 -m json.tool

# Verificar informações do webhook
curl -X GET "https://api.telegram.org/bot8117130143:AAFArCYBhEKZRDYgMYBaxQZJs9N09BvCrVw/getWebhookInfo" | python3 -m json.tool
```

O resultado de `getWebhookInfo` deve mostrar:
- `url`: `https://gigflowagenda.com.br/api/notifications/telegram/webhook/`
- `pending_update_count`: Deve diminuir (mensagens pendentes sendo processadas)
- `last_error_message`: Deve desaparecer

### Passo 4: Testar o webhook

```bash
# Testar com uma mensagem simulada (deve retornar {"ok": true})
curl -X POST https://gigflowagenda.com.br/api/notifications/telegram/webhook/ \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: gigflow_webhook_secret_2024_secure_token_change_this" \
  -d '{"message":{"chat":{"id":"123456789"},"text":"/start","from":{"first_name":"Test"}}}'
```

### Passo 5: Testar no Telegram

1. Abra o bot **@GigFlowAgendaBot** no Telegram
2. Envie `/start`
3. Deve receber mensagem de boas-vindas

---

## 🚫 Opção 2: Remover Segredo (SIMPLES, menos seguro)

Esta opção desativa a validação do webhook. Simples de implementar, mas menos seguro.

### Passo 1: Remover o segredo do .env.docker

Edite o arquivo `.env.docker` e remova ou deixe vazio a linha:

```env
TELEGRAM_WEBHOOK_SECRET=
# ou comentar:
# TELEGRAM_WEBHOOK_SECRET=gigflow_webhook_secret_2024_secure_token_change_this
```

### Passo 2: Reconfigurar o webhook sem segredo

```bash
python manage.py setup_telegram_bot \
  --webhook-url https://gigflowagenda.com.br/api/notifications/telegram/webhook/ \
  --secret ""
```

### Passo 3: Reiniciar o backend

```bash
docker-compose -f docker-compose.prod.yml restart backend
# OU
sudo systemctl restart gunicorn
```

### Passo 4: Verificar e testar

Mesmos passos da Opção 1 (Passos 3, 4 e 5).

---

## 🔍 Verificação da Solução

Após aplicar qualquer das opções, execute estes testes:

### Teste 1: Verificar status do webhook

```bash
curl -X GET "https://api.telegram.org/bot8117130143:AAFArCYBhEKZRDYgMYBaxQZJs9N09BvCrVw/getWebhookInfo" | python3 -m json.tool
```

**Resultado esperado:**
```json
{
  "ok": true,
  "result": {
    "url": "https://gigflowagenda.com.br/api/notifications/telegram/webhook/",
    "pending_update_count": 0,  // ← Deve ser 0 ou diminuir
    // last_error_message deve estar ausente
  }
}
```

### Teste 2: Enviar mensagem no Telegram

1. Abra **@GigFlowAgendaBot** no Telegram
2. Envie `/start`
3. **Deve receber mensagem:** "*Bem-vindo ao GigFlow - Agenda!*"

### Teste 3: Testar fluxo de conexão

1. Acesse `https://gigflowagenda.com.br/configuracoes/notificacoes`
2. Faça login (se necessário)
3. Clique em **"Conectar Telegram"**
4. Copie o código de 6 caracteres
5. Abra o bot **@GigFlowAgendaBot** no Telegram
6. Envie o código
7. **Deve aparecer:** "*Conta conectada com sucesso, [Nome]!*"

---

## 📋 Checklist de Implementação

- [ ] Fazer pull das mudanças do código
- [ ] Reiniciar o backend
- [ ] Reconfigurar o webhook (com ou sem segredo)
- [ ] Verificar informações do webhook (getWebhookInfo)
- [ ] Testar envio de `/start` no Telegram
- [ ] Testar fluxo completo de conexão pelo app
- [ ] Verificar que `pending_update_count` está diminuindo

---

## ⚠️ Notas Importantes

1. **Mensagens Pendentes**: O webhook tem **5 mensagens pendentes** que falharam anteriormente. Após corrigir o problema, estas mensagens serão reenviadas automaticamente pelo Telegram.

2. **Segurança**: A Opção 1 (com segredo) é mais segura porque garante que apenas o Telegram com o segredo correto pode enviar requisições ao webhook.

3. **Logs**: Monitore os logs do backend para verificar se as mensagens estão sendo processadas:
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f backend | grep -i telegram
   ```

4. **Deploy Certificates**: Se no futuro você quiser usar certificados TLS customizados para o webhook, o comando `setup_telegram_bot` pode ser expandido para suportar isso.

---

## 🆘 Troubleshooting

### Erro: "Unauthorized" continua aparecendo

- Verifique se o backend foi reiniciado
- Verifique se o webhook foi reconfigurado com o segredo correto
- Verifique os logs do backend: `docker-compose logs backend`

### O bot não responde a `/start`

- Verifique se o webhook está configurado corretamente: `getWebhookInfo`
- Verifique logs do backend
- Teste o webhook diretamente com curl

### pending_update_count não diminui

- Isso pode demorar alguns minutos, o Telegram reenvia mensagens com atraso
- Verifique se não há mais erros no webhook
- Se persistir, pode ser necessário deletar e reconfigurar o webhook

---

## 📞 Suporte

Se encontrar problemas, forneça:

1. Saída de `getWebhookInfo`
2. Logs do backend (últimas 50 linhas)
3. Resultado do teste de curl para o webhook
4. Versão do código em produção (git log --oneline -1)
