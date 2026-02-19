# PWA Release Gate

Checklist oficial para homologacao e liberacao de release PWA no GigFlow.

## Objetivo

Evitar regressao de:

- carregamento infinito
- instalacao/update/offline do PWA
- contratos de telemetria (`/api/vitals/`, `/api/analytics/pwa/`)

## Escopo do Gate

- Rotas criticas: `/`, `/app-start`, `/login`, `/musicos`, `/eventos`
- Ambientes: homologacao e producao
- Plataformas manuais: Android (Chrome) e iOS (Safari)

## Etapa 1: Gate automatico (bloqueante)

Executar:

```bash
bash scripts/qa/pwa_gate.sh
```

Validacoes obrigatorias:

1. `GET /manifest.json` retorna `200`
2. `GET /sw.js` retorna `200` com `cache-control` contendo `no-cache` e `no-store`
3. `GET /offline.html` retorna `200`
4. `GET /app-start` retorna `200`
5. `GET /api/readyz/` retorna `200` e `status/checks = ok`
6. `POST /api/vitals/` retorna `202`
7. `POST /api/analytics/pwa/` com `pwa_auto_update_applied` retorna `202`

## Etapa 2: Smoke manual curto (obrigatorio para go-live)

### Android Chrome

1. Abrir app e validar render da landing.
2. Acionar instalacao do app e concluir.
3. Abrir app instalado e navegar em `/musicos` e `/eventos`.
4. Colocar dispositivo offline e validar fallback sem loop.
5. Voltar online e validar recuperacao.

### iOS Safari (incluindo iPhone SE)

1. Abrir app no Safari.
2. Validar fluxo "Adicionar a Tela de Inicio".
3. Abrir app instalado.
4. Navegar em `/musicos` e `/eventos`.
5. Validar comportamento offline e retorno online.

## Casos funcionais de regressao obrigatorios

1. Deep link: `/musicos?instrument=bass` carrega sem loop.
2. Equivalencias de instrumento:
   - `violao`
   - `violonista`
   - `acoustic_guitar`
   - `acoustic guitar`
3. Todos retornam conjunto coerente de resultados.

## Evidencias obrigatorias da release

Preencher no PR/release:

1. Link da run CI
2. Link da run CD
3. Resultado do script `pwa_gate.sh`
4. Checklist manual Android
5. Checklist manual iOS
6. Timestamp das validacoes

## Go / No-Go

Go-live permitido apenas quando:

1. `backend`, `frontend`, `pwa_gate`, `e2e` e `security_audit` em verde.
2. CD em verde.
3. Smoke manual Android + iOS concluido.
4. Nenhuma regressao critica de loading infinito.
