# PWA Incident Runbook

Guia rapido para diagnostico e resposta quando o PWA quebrar em producao.

## Sinais de incidente

- usuarios reportam loading infinito
- erro na instalacao/update/offline
- `pwa_gate.sh` falha no CD
- falhas em `/api/vitals/` ou `/api/analytics/pwa/`
- `readyz` degradado

## Severidade

- **SEV-1**: app indisponivel ou loop global de loading
- **SEV-2**: rotas principais funcionam, mas PWA/update/offline quebrado
- **SEV-3**: degradacao parcial sem bloqueio de uso

## Triage imediato (5-10 min)

1. Verificar run mais recente de CI e CD.
2. Executar:

```bash
./deploy.sh status
```

3. Verificar saude:

```bash
curl -sS https://gigflowagenda.com.br/healthz/
curl -sS https://gigflowagenda.com.br/api/readyz/
```

4. Rodar gate manual contra producao:

```bash
APP_BASE_URL="https://gigflowagenda.com.br" \
API_BASE_URL="https://gigflowagenda.com.br/api" \
bash scripts/qa/pwa_gate.sh
```

## Diagnostico rapido por sintoma

### 1) Loading infinito na landing ou rotas

1. Conferir `index.html` e chunks no deploy atual.
2. Verificar logs do frontend/nginx:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=150 frontend nginx
```

3. Verificar `sw.js` e `manifest.json` retornando `200`.

### 2) Offline fallback quebrado

1. Validar `offline.html` retornando `200`.
2. Validar `sw.js` com `no-cache,no-store`.
3. Forcar hard reload no dispositivo e testar novamente.

### 3) Telemetria PWA quebrada

1. Testar manualmente:

```bash
curl -sS -X POST https://gigflowagenda.com.br/api/vitals/ \
  -H "Content-Type: application/json" \
  --data '{"name":"LCP","value":1200,"rating":"good"}'

curl -sS -X POST https://gigflowagenda.com.br/api/analytics/pwa/ \
  -H "Content-Type: application/json" \
  --data '{"event":"pwa_auto_update_applied","data":{"source":"runbook"}}'
```

2. Confirmar retorno `202`.

## Rollback

Quando houver falha em deploy automatico, o workflow ja tenta rollback para `PRE_DEPLOY_SHA`.

Rollback manual:

```bash
cd /opt/agenda-musicos/agenda_musicos
git fetch origin
git reset --hard <SHA_ESTAVEL>
./deploy.sh build
./deploy.sh status
```

## Validacao pos-rollback

1. `healthz` e `readyz` com status `ok`.
2. `pwa_gate.sh` verde em producao.
3. Smoke manual curto em Android/iOS.

## Comunicacao

No incidente, registrar:

1. horario de deteccao
2. impacto (rotas/usuarios afetados)
3. causa raiz preliminar
4. acao aplicada (fix ou rollback)
5. horario de recuperacao
6. follow-up preventivo
