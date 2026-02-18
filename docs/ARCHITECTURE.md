# Arquitetura do Sistema - GigFlow

**Versao:** 1.0.0 | **Atualizado:** Fevereiro 2026

---

## 1. Visao Geral

GigFlow e uma plataforma de conexao entre musicos e contratantes. Permite que musicos gerenciem agenda, disponibilidade e recebam propostas de trabalho; contratantes buscam e contratam musicos para eventos; e administradores moderam o acesso e acompanham a operacao.

**Tipos de usuario:**

| Tipo | Acesso | Descricao |
|------|--------|-----------|
| Musico | Convite (aprovado por admin) | Agenda, eventos, conexoes, marketplace, perfil publico |
| Contratante | Cadastro direto | Busca musicos, solicita orcamentos, reserva |
| Admin | is_staff no Django | Aprovacao de solicitacoes, auditoria, gestao de cidades |

---

## 2. Stack Tecnologico

### Backend
- **Django 5.2** + Django REST Framework 3.16
- **PostgreSQL 15** (producao) / SQLite (dev)
- **Redis** (cache e sessoes)
- **Gunicorn** + **Nginx** (producao)
- **Docker** + Docker Compose
- **SimpleJWT** (autenticacao via cookies httpOnly)
- **drf-spectacular** (OpenAPI/Swagger)

### Frontend
- **React 19** + TypeScript 5.9
- **Vite 7** (bundler)
- **Tailwind CSS 3** (estilizacao)
- **SWR** (data fetching e cache)
- **React Router v6** (roteamento)
- **Framer Motion** (animacoes)
- **React Hook Form** (formularios)
- **Lucide** (icones)
- **PWA** (vite-plugin-pwa, service worker)

### Infraestrutura
- **GitHub Actions** (CI/CD)
- **Self-hosted runner** no servidor de producao
- **Docker Compose** (prod e dev)
- **Supervisor** (process manager - deploy nao-Docker)
- **Certbot/Let's Encrypt** (TLS)

---

## 3. Diagrama de Componentes

```
                         +------------------+
                         |   Navegador/PWA  |
                         |  (React 19 SPA)  |
                         +--------+---------+
                                  |
                            HTTPS |
                                  v
                         +--------+---------+
                         |      Nginx       |
                         |  (reverse proxy) |
                         +--------+---------+
                                  |
                    +-------------+-------------+
                    |                           |
              /api/*|                    static |files
                    v                           v
           +-------+--------+         +--------+-------+
           |    Gunicorn     |         |  Frontend Dist |
           |  (Django DRF)   |         |  (Vite build)  |
           +-------+--------+         +----------------+
                   |
         +---------+---------+
         |                   |
         v                   v
  +------+------+    +------+------+
  |  PostgreSQL  |    |    Redis    |
  |   (dados)    |    |   (cache)   |
  +-------------+    +-------------+

Integracoes externas:
  - Google OAuth API
  - Telegram Bot API
  - Gmail SMTP
  - Nominatim/OpenStreetMap (geocoding)
  - IBGE API (municipios brasileiros)
```

---

## 4. Django Apps

O backend esta organizado em 3 apps Django:

### 4.1 `agenda` (App Principal)

Gerencia musicos, eventos, disponibilidade, conexoes, orcamentos e reservas.

**Models principais:** Musician, Event, Availability, LeaderAvailability, Instrument, Organization, Membership, Connection, MusicianRating, MusicianRequest, ContractorProfile, QuoteRequest, QuoteProposal, Booking, BookingEvent, MusicianBadge, City, EventLog, AuditLog

**Views organizadas em modulos:**
```
agenda/views/
  instruments.py      # InstrumentViewSet
  badges.py           # BadgeViewSet
  connections.py       # ConnectionViewSet
  musicians.py         # MusicianViewSet
  availabilities.py    # AvailabilityViewSet
  leader_availabilities.py  # LeaderAvailabilityViewSet
  events.py            # EventViewSet
```

### 4.2 `marketplace`

Vagas/gigs publicadas por contratantes, com aplicacoes de musicos e chat.

**Models:** Gig, GigApplication, GigChatMessage

### 4.3 `notifications`

Sistema de notificacoes multi-canal com suporte a email, Telegram, WhatsApp (placeholder) e SMS (placeholder).

**Models:** NotificationPreference, NotificationLog, TelegramVerification

**Providers:**
```
notifications/providers/
  email.py       # SMTP via Django mail
  telegram.py    # Telegram Bot API
  whatsapp.py    # Placeholder
```

---

## 5. Modelo de Dominio

```
User (Django built-in)
|
+-- Musician (1:1)
|   +-- Availabilities (1:N) ---- Event
|   +-- Connections (1:N) -------- Musician (target)
|   +-- MusicianBadge (1:N)
|   +-- MusicianRating (1:N)
|   +-- QuoteRequests (1:N) ------ ContractorProfile
|   +-- GigApplications (1:N) --- Gig
|
+-- ContractorProfile (1:1)
|   +-- QuoteRequests (1:N)
|   +-- ContactViews (1:N)
|
+-- Memberships (1:N) ------------ Organization
|
+-- NotificationPreference (1:1)
+-- NotificationLog (1:N)

Organization
+-- Memberships (1:N, roles: owner/admin/member)
+-- Events (1:N)
+-- Gigs (1:N)
+-- LeaderAvailabilities (1:N)

Event
+-- Availabilities (1:N, respostas dos musicos)
+-- EventLogs (1:N, trilha de auditoria)
+-- MusicianRatings (1:N)

QuoteRequest (Contratante -> Musico)
+-- QuoteProposal (1:N, propostas do musico)
+-- Booking (1:1, reserva confirmada)
+-- BookingEvent (1:N, auditoria do fluxo)

Gig (Marketplace)
+-- GigApplication (1:N)
    +-- GigChatMessage (1:N)

Instrument (standalone, referenciado por JSON em Musician)
City (standalone, gestao geografica)
```

---

## 6. Fluxos Principais

### 6.1 Acesso de Musico

```
Musico solicita acesso (/solicitar-acesso)
       |
       v
MusicianRequest criado (status: pending)
       |
       v
Admin aprova (POST /api/admin/musician-requests/{id}/approve/)
       |
       v
Email com link de convite (invite_token)
       |
       v
Musico registra senha (/cadastro/invite?token=xxx)
       |
       v
User + Musician criados, JWT emitido via cookies
       |
       v
Dashboard do musico
```

### 6.2 Contratacao (Quote Flow)

```
Contratante busca musicos (/contratante/musicos)
       |
       v
Cria QuoteRequest (POST /api/quotes/)
       |
       v
Musico recebe notificacao (email/Telegram)
       |
       v
Musico envia QuoteProposal (valor + mensagem)
       |
       v
Contratante aceita proposta
       |
       v
Booking criado (status: reserved -> confirmed -> completed)
```

### 6.3 Eventos

```
Lider cria Event (POST /api/events/)
       |
       v
Musicos convidados recebem notificacao
       |
       v
Cada musico marca Availability (available/unavailable/pending)
       |
       v
Lider confirma evento quando quorum atingido
       |
       v
Event status: proposed -> approved -> confirmed
```

### 6.4 Marketplace

```
Contratante publica Gig (POST /api/marketplace/gigs/)
       |
       v
Musicos veem no marketplace (/marketplace)
       |
       v
Musico envia GigApplication (carta + valor)
       |
       v
Chat via GigChatMessage
       |
       v
Contratante seleciona (status: hired)
```

---

## 7. Autenticacao e Seguranca

Detalhes completos em [`docs/authentication-flows.md`](./authentication-flows.md).

**Resumo:**

| Aspecto | Implementacao |
|---------|---------------|
| Tokens | JWT (SimpleJWT) em cookies httpOnly |
| Access token | 5 min expiracao |
| Refresh token | 7 dias expiracao |
| Cookie flags | Secure (prod), SameSite=Lax, HttpOnly |
| Sessao frontend | sessionStorage (limpa ao fechar navegador) |
| Google OAuth | ID token verification, auto-criacao de conta |
| Rate limiting | Login, Google Auth (20/min), registro (5/min) |
| CSP | Content-Security-Policy configurado em middleware |
| CORS | Origins configuradas por ambiente |
| CSRF | X-CSRF-TOKEN header |
| Admin URL | Path protegido por variavel de ambiente |

---

## 8. Integracoes Externas

### Google OAuth
- **Proposito:** Login e registro alternativo
- **Backend:** Verificacao de ID token via `google-auth` library
- **Endpoints:** `POST /api/auth/google/`, `POST /api/auth/google/register-musician/`
- **Config:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Telegram Bot
- **Proposito:** Notificacoes em tempo real
- **Bot:** @GigFlowAgendaBot
- **Integracao:** Webhook (`POST /api/notifications/telegram/webhook/`)
- **Verificacao:** Codigos de 6 digitos para vincular conta
- **Config:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`

### Email (SMTP)
- **Proposito:** Notificacoes, convites, reset de senha
- **Provider:** Gmail SMTP (ou configuravel)
- **Templates:** Django templates em `templates/emails/`
- **Tipos:** Aprovacao de acesso, boas-vindas, reset de senha, convites de evento, notificacoes de orcamento

### Nominatim (Geocoding)
- **Proposito:** Detectar cidade do usuario via GPS
- **API:** OpenStreetMap Nominatim (gratuito)
- **Rate limit:** 1 req/segundo (politica Nominatim)
- **Cache:** 1 hora no frontend
- **Servico:** `frontend/src/services/geocoding.ts`

### IBGE API
- **Proposito:** Lista de estados e municipios brasileiros
- **API:** IBGE servicodados (gratuito, sem auth)
- **Servico:** `frontend/src/services/ibge.ts`

---

## 9. Frontend - Arquitetura

### 9.1 Roteamento

O frontend possui 4 grupos de rotas:

| Grupo | Prefixo | Auth Context | Exemplo |
|-------|---------|-------------|---------|
| Publico | `/` | Nenhum | `/login`, `/solicitar-acesso`, `/nossos-musicos` |
| Musico | `/dashboard`, `/eventos`, ... | AuthContext | `/eventos/novo`, `/conexoes` |
| Contratante | `/contratante/` | CompanyAuthContext | `/contratante/dashboard`, `/contratante/musicos` |
| Admin | `/admin/` | AdminAuthContext | `/admin/dashboard`, `/admin/solicitacoes` |

**Total:** ~35 rotas, ~30 page components

### 9.2 State Management (Contexts)

```
frontend/src/contexts/
  AuthContext.tsx         # Sessao do musico (user, login, logout, refresh)
  CompanyAuthContext.tsx  # Sessao do contratante (organization, login, logout)
  AdminAuthContext.tsx    # Sessao do admin (user + is_staff)
  ThemeContext.tsx        # Dark/light mode
```

### 9.3 Services Layer

```
frontend/src/services/
  api.ts                 # Axios instance + interceptors (refresh automatico)
  publicApi.ts           # Axios sem auth (login, registro)
  authService.ts         # Login, logout, refresh
  musicianService.ts     # CRUD musicos
  eventService.ts        # CRUD eventos
  connectionService.ts   # Conexoes entre musicos
  badgeService.ts        # Badges/conquistas
  marketplaceService.ts  # Gigs e aplicacoes
  geocoding.ts           # Nominatim geocoding
  ibge.ts                # Estados/municipios IBGE
  companyService.ts      # Dashboard e perfil de contratante
  quoteService.ts        # Orcamentos
```

### 9.4 Custom Hooks

```
frontend/src/hooks/
  useMusicians.ts        # Lista musicos (SWR)
  useEvents.ts           # Eventos + CRUD
  useConnections.ts      # Conexoes
  useInstruments.ts      # Instrumentos
  useNotifications.ts    # Notificacoes
  useMusicianEvents.ts   # Eventos de um musico
  useGeolocation.ts      # GPS do navegador + geocoding
  useHaptics.ts          # Feedback haptico (mobile)
  useInstallPrompt.ts    # Prompt de instalacao PWA
  useBodyScrollLock.ts   # Trava scroll (modais)
  useLowPowerMode.ts     # Modo economia de energia
  useNetworkStatus.ts    # Online/offline
  usePageMeta.ts         # Titulo da pagina
  usePerformanceConfig.ts # Config de performance
  usePullToRefresh.ts    # Pull-to-refresh (mobile)
```

### 9.5 Componentes

```
frontend/src/components/
  Layout/                # AppLayout, Sidebar, Header, BottomNav
  common/                # Cards, Loading, Empty states
  ui/                    # Botoes, inputs, modais, badges
  modals/                # Modais de confirmacao, formularios
```

### 9.6 PWA

- Service worker via `vite-plugin-pwa`
- Manifest com icones e splash screens
- Hook `useInstallPrompt` para prompt nativo
- Pagina `/app-start` como entry point PWA
- Safe area support (notched devices)

---

## 10. Estrutura de Diretorios

```
agenda-musicos/
+-- config/                  # Django settings, urls, auth views
+-- agenda/                  # App principal (musicos, eventos, quotes)
|   +-- views/               # ViewSets modulares
|   +-- templates/emails/    # Templates de email
|   +-- tests/               # Testes backend
|   +-- services/            # Email service, image processing
+-- marketplace/             # App de vagas/gigs
+-- notifications/           # App de notificacoes multi-canal
|   +-- providers/           # Email, Telegram, WhatsApp providers
+-- frontend/                # React SPA
|   +-- src/
|       +-- pages/           # ~30 page components
|       +-- components/      # Layout, common, ui, modals
|       +-- contexts/        # Auth, CompanyAuth, AdminAuth, Theme
|       +-- hooks/           # 15 custom hooks
|       +-- services/        # API services layer
|       +-- types/           # TypeScript types
+-- deploy/                  # Scripts de deploy e automacao
|   +-- automation/          # Backup, monitoramento, health checks
+-- docs/                    # Documentacao
+-- docker-compose.yml       # Docker producao
+-- docker-compose.dev.yml   # Docker desenvolvimento
+-- Makefile                 # Comandos backend
+-- setup.sh                 # Instalacao inicial
+-- update.sh                # Atualizacao
```

---

## 11. API - Superficie

### Endpoints Principais

**Autenticacao:**
- `POST /api/token/` — Login musico
- `POST /api/token/refresh/` — Refresh token
- `POST /api/token/logout/` — Logout
- `POST /api/contractor/token/` — Login contratante
- `POST /api/admin/token/` — Login admin
- `POST /api/auth/google/` — Google OAuth

**Musicos:**
- `GET/POST /api/musicians/` — Lista/cria
- `GET/PATCH /api/musicians/{id}/` — Detalhe/atualiza
- `GET /api/musicians/me/` — Perfil logado
- `GET /api/musicians/public-by-city/` — Busca publica por cidade
- `PATCH /api/musicians/avatar/` — Upload avatar

**Eventos:**
- `GET/POST /api/events/` — Lista/cria
- `GET/PATCH/DELETE /api/events/{id}/` — CRUD
- `POST /api/events/{id}/set_availability/` — Marcar disponibilidade

**Conexoes:**
- `GET/POST /api/connections/` — Lista/cria conexao
- `DELETE /api/connections/{id}/` — Remove

**Orcamentos (Quotes):**
- `POST /api/quotes/` — Criar orcamento
- `GET /api/quotes/contractor/` — Orcamentos do contratante
- `GET /api/quotes/musician/` — Orcamentos do musico

**Marketplace:**
- `GET/POST /api/marketplace/gigs/` — Vagas
- `GET/POST /api/marketplace/applications/` — Aplicacoes

**Notificacoes:**
- `GET/POST /api/notifications/preferences/` — Preferencias
- `POST /api/notifications/telegram/connect/` — Vincular Telegram

**Admin:**
- `GET /api/admin/musician-requests/` — Solicitacoes
- `POST /api/admin/musician-requests/{id}/approve/` — Aprovar
- `POST /api/admin/musician-requests/{id}/reject/` — Rejeitar

**Docs (dev apenas):**
- `GET /api/docs/` — Swagger UI
- `GET /api/redoc/` — ReDoc
- `GET /api/schema/` — OpenAPI JSON

**Health:**
- `GET /healthz/` — Health check
- `GET /api/readyz/` — Readiness (DB + cache)

---

## 12. Deploy e CI/CD

Detalhes completos em [`docs/CICD_PRODUCAO.md`](./CICD_PRODUCAO.md).

**Resumo:**

1. Branch de feature → PR para `main`
2. CI roda automaticamente (lint, testes, build)
3. Merge na `main` → CI roda novamente
4. CI verde → CD dispara no runner self-hosted
5. Deploy via `deploy.sh` no servidor

**Ambientes:**
- **Dev:** `docker-compose.dev.yml` (hot reload frontend e backend)
- **Producao:** `docker-compose.yml` (Nginx + Gunicorn + PostgreSQL + Redis)

---

## 13. Decisoes Arquiteturais

| Decisao | Justificativa |
|---------|---------------|
| JWT em cookies httpOnly | Protecao contra XSS (tokens inacessiveis via JS) |
| sessionStorage (nao localStorage) | Sessao limpa ao fechar navegador |
| SWR para data fetching | Cache automatico, revalidacao, dedup de requests |
| ViewSets modulares | Evitar arquivos monoliticos (views_legacy.py tinha 2000+ linhas) |
| Multi-channel notifications | Flexibilidade (email fallback se Telegram falha) |
| Nominatim ao inves de Google Maps | 100% gratuito, sem API key |
| PWA | Experiencia mobile nativa sem app store |
| Rate limiting por endpoint | Protecao contra abuso (especialmente auth e Google OAuth) |

---

## Documentacao Relacionada

- [Fluxos de Autenticacao](./authentication-flows.md) — Detalhes de auth (cookies, refresh, OAuth)
- [CI/CD Producao](./CICD_PRODUCAO.md) — Pipeline e deploy
- [Configuracao Google OAuth](./configuracao-google-oauth.md) — Setup OAuth no servidor
- [Troubleshooting Telegram](./troubleshooting-telegram-webhook.md) — Correcao webhook Telegram
