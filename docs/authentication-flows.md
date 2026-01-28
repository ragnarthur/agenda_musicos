# Fluxos de Autenticação - GigFlow

Documentação completa dos fluxos de autenticação da plataforma GigFlow, uma plataforma 2-em-1 para músicos e empresas.

---

## 📚 Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Formato Padrão de Respostas](#formato-padrão-de-respostas)
4. [Fluxo de Músicos](#fluxo-de-músicos)
5. [Fluxo de Empresas](#fluxo-de-empresas)
6. [Sistema de Sessão](#sistema-de-sessão)
7. [Recuperação de Senha](#recuperação-de-senha)
8. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O GigFlow possui dois fluxos de autenticação distintos mas consistentes:

- **Músicos**: Registro via convite (aprovação de admin) + Login tradicional
- **Empresas**: Registro direto + Login tradicional ou Google OAuth

Ambos utilizam:
- **Cookies httpOnly** para armazenar tokens JWT de forma segura
- **sessionStorage** para gerenciar sessão (limpa ao fechar navegador)
- **Refresh automático** de tokens via interceptors Axios

---

## Stack Tecnológica

### Backend
- **Framework**: Django REST Framework
- **Autenticação**: JWT via `djangorestframework-simplejwt`
- **Cookies**: httpOnly, secure (prod), SameSite='Lax'
- **Rate Limiting**: 30 requisições/minuto em endpoints de autenticação

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **HTTP Client**: Axios com interceptors
- **State Management**: Context API (AuthContext + CompanyAuthContext)
- **Storage**: sessionStorage (não localStorage por segurança)

---

## Formato Padrão de Respostas

Todas as respostas de autenticação seguem este formato:

```typescript
{
  detail: string;              // Mensagem de sucesso/erro
  access: string | null;       // JWT access token (ou null se não gerado)
  refresh: string | null;      // JWT refresh token (ou null se não gerado)
  user_type: 'musician' | 'company';  // Tipo de usuário

  // Campos opcionais
  user?: {                     // Dados do músico (se user_type = 'musician')
    id: number;
    username: string;
    email: string;
    first_name: string;
    // ...
  };

  organization?: {             // Dados da empresa (se user_type = 'company')
    id: number;
    name: string;
    org_type: string;
  };
}
```

---

## Fluxo de Músicos

### 1️⃣ Solicitar Acesso

**Endpoint**: `POST /api/musician-requests/`

**Request**:
```json
{
  "email": "musico@example.com",
  "first_name": "João",
  "last_name": "Silva",
  "phone": "(34) 99999-9999",
  "instruments": [1, 2],
  "city": "Monte Carmelo",
  "state": "MG",
  "experience_years": 5
}
```

**Response**: `201 Created`
```json
{
  "message": "Solicitação enviada com sucesso!"
}
```

**Email enviado**:
- Para: Administradores do sistema
- Template: `new_request_admin.html`
- Conteúdo: Notificação de nova solicitação

---

### 2️⃣ Admin Aprovar Solicitação

**Endpoint**: `POST /api/admin/musician-requests/{id}/approve/`

**Headers**:
```
Authorization: Bearer {admin_jwt_token}
```

**Request**:
```json
{
  "admin_notes": "Músico experiente, aprovado para registro"
}
```

**Response**: `200 OK`
```json
{
  "message": "Solicitação aprovada",
  "invite_token": "abc123..."
}
```

**Email enviado**:
- Para: Email do músico
- Template: `request_approved.html`
- Conteúdo: Link com invite token
- Formato do link: `https://gigflow.com/cadastro?token=abc123...&email=musico@example.com`

---

### 3️⃣ Registro com Convite

**Endpoint**: `POST /api/register-with-invite/`

**Request**:
```json
{
  "invite_token": "abc123...",
  "password": "SenhaSegura@123"
}
```

**Response**: `201 Created`
```json
{
  "detail": "Registro concluído com sucesso!",
  "access": "eyJ0eXAiOiJKV1QiLCJh...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJh...",
  "user_type": "musician",
  "user": {
    "id": 1,
    "username": "joao_silva",
    "email": "musico@example.com",
    "first_name": "João",
    "last_name": "Silva"
  }
}
```

**Cookies criados**:
```
Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax; Path=/
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax; Path=/
```

**Email enviado**:
- Para: Email do músico
- Template: `welcome_musician.html`
- Conteúdo: Boas-vindas + tutorial

**Frontend**:
1. Salva `SESSION_KEY = 'gigflow_session_active'` no sessionStorage
2. Redireciona para `/dashboard`

---

### 4️⃣ Login Normal (Músicos)

**Endpoint**: `POST /api/token/`

**Request**:
```json
{
  "username": "joao_silva",
  "password": "SenhaSegura@123"
}
```

**Response**: `200 OK`
```json
{
  "detail": "Login realizado com sucesso",
  "access": "eyJ0eXAiOiJKV1QiLCJh...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJh..."
}
```

**Cookies criados**: Mesmos cookies httpOnly do registro

**Frontend**:
1. Salva `SESSION_KEY` no sessionStorage
2. Chama `GET /api/musicians/me/` para buscar dados do usuário
3. Redireciona para `/dashboard`

**Erros Comuns**:
- `401`: "No active account found with the given credentials"
- `429`: "Too many login attempts. Try again in X minutes."
- `500`: "Internal server error"

---

## Fluxo de Empresas

### 1️⃣ Registro de Empresa

**Endpoint**: `POST /api/register-company/`

**Request**:
```json
{
  "email": "empresa@example.com",
  "password": "SenhaSegura@123",
  "company_name": "Bar do João",
  "org_type": "bar",
  "phone": "(34) 99999-9999",
  "city": "Monte Carmelo",
  "state": "MG"
}
```

**Response**: `201 Created`
```json
{
  "detail": "Empresa cadastrada com sucesso!",
  "user_type": "company",
  "organization": {
    "id": 1,
    "name": "Bar do João",
    "org_type": "bar"
  },
  "username": "empresa_example_com",
  "email": "empresa@example.com",
  "access": null,
  "refresh": null
}
```

**Nota**: Tokens não são gerados no registro. Usuário precisa fazer login após registro.

**Email enviado**:
- Para: Email da empresa
- Template: `welcome_company.html`
- Conteúdo: Boas-vindas + instruções de login

---

### 2️⃣ Login Normal (Empresas)

**Endpoint**: `POST /api/company/token/`

**Request**:
```json
{
  "email": "empresa@example.com",
  "password": "SenhaSegura@123"
}
```

**Response**: `200 OK`
```json
{
  "detail": "Login realizado com sucesso",
  "access": "eyJ0eXAiOiJKV1QiLCJh...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJh...",
  "user_type": "company",
  "organization": {
    "id": 1,
    "name": "Bar do João",
    "org_type": "bar"
  }
}
```

**Cookies criados**: Mesmos cookies httpOnly

**Frontend**:
1. Salva `SESSION_KEY = 'gigflow_company_session'` no sessionStorage
2. Salva dados da organização no sessionStorage (apenas para UI)
3. Redireciona para `/empresa/dashboard`

---

### 3️⃣ Login com Google OAuth (Empresas)

**Endpoint**: `POST /api/auth/google/`

**Request**:
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "user_type": "company"
}
```

**Response (Usuário Existente)**: `200 OK`
```json
{
  "detail": "Autenticado com sucesso.",
  "access": "eyJ0eXAiOiJKV1QiLCJh...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJh...",
  "user_type": "company",
  "new_user": false,
  "organization": {
    "id": 1,
    "name": "Bar do João",
    "org_type": "bar"
  }
}
```

**Response (Novo Usuário)**: `200 OK`
```json
{
  "detail": "Autenticado com sucesso.",
  "access": "eyJ0eXAiOiJKV1QiLCJh...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJh...",
  "user_type": "unknown",
  "new_user": true
}
```

**Frontend (Novo Usuário)**:
1. Detecta `new_user: true`
2. Redireciona para página de completar cadastro
3. Usuário preenche: nome da empresa, tipo, telefone, cidade
4. Atualiza perfil via `PATCH /api/company/profile/`

---

## Sistema de Sessão

### Funcionamento

**sessionStorage**:
- Marca sessão ativa com `SESSION_KEY`
- Limpa automaticamente ao fechar navegador
- Garante que usuário precisa fazer login novamente ao reabrir

**Cookies httpOnly**:
- Armazenam tokens JWT
- Inacessíveis via JavaScript (proteção contra XSS)
- SameSite='Lax' (proteção contra CSRF)
- Secure=true em produção (apenas HTTPS)

### Bootstrap da Sessão

**Ao abrir aplicação**:

1. Frontend verifica se `SESSION_KEY` existe no sessionStorage
2. Se **não existe**:
   - Chama logout no backend (limpar cookies antigos)
   - Redireciona para login
3. Se **existe**:
   - Tenta buscar dados do usuário (`/api/musicians/me/` ou `/api/company/dashboard/`)
   - Se sucesso: restaura sessão
   - Se erro 401: remove `SESSION_KEY` e redireciona para login

### Refresh Automático de Token

**Interceptor Axios** (`frontend/src/services/api.ts`):

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;

      try {
        // Chama refresh via cookies
        await axios.post('/api/token/refresh/', {}, { withCredentials: true });

        // Retry requisição original
        return api(error.config);
      } catch (refreshError) {
        // Refresh falhou: logout + redirect
        sessionStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
```

**Endpoint de Refresh**: `POST /api/token/refresh/`

**Request**: `{}` (vazio, refresh token vem do cookie)

**Response**: `200 OK`
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJh..."
}
```

**Novo cookie**: Access token atualizado

---

## Recuperação de Senha

### 1️⃣ Solicitar Reset

**Endpoint**: `POST /api/password-reset/`

**Request**:
```json
{
  "email": "usuario@example.com"
}
```

**Response**: `200 OK`
```json
{
  "message": "Se este email estiver cadastrado, enviaremos um link para redefinição."
}
```

**Email enviado**:
- Template: `password_reset.html`
- Link: `https://gigflow.com/redefinir-senha?uid=abc&token=xyz`
- Expiração: **1 hora**

---

### 2️⃣ Confirmar Reset

**Endpoint**: `POST /api/password-reset-confirm/`

**Request**:
```json
{
  "uid": "abc",
  "token": "xyz",
  "new_password": "NovaSenhaSegura@123"
}
```

**Response (Sucesso)**: `200 OK`
```json
{
  "message": "Senha atualizada com sucesso."
}
```

**Response (Token Inválido)**: `400 Bad Request`
```json
{
  "error": "Link expirado ou inválido. Solicite uma nova redefinição."
}
```

**Validações de Senha**:
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial

---

## Troubleshooting

### Problema: "Sessão expirada" ao fechar navegador

**Causa**: sessionStorage limpa ao fechar navegador

**Solução**: Comportamento esperado por segurança. Usuário deve fazer login novamente.

---

### Problema: "Token inválido" após alguns minutos

**Causa**: Access token expirou (tempo de vida: ~5 minutos)

**Solução**:
- Interceptor Axios deve fazer refresh automático
- Verificar se cookies estão sendo enviados (`withCredentials: true`)
- Verificar CORS no backend

---

### Problema: Refresh loop infinito

**Causa**: Refresh token também expirou (tempo de vida: ~24h)

**Solução**:
- Implementar flag `_retry` no interceptor para evitar loop
- Fazer logout completo e redirecionar para login

---

### Problema: CORS erro ao fazer login

**Causa**: Backend não está aceitando origem do frontend

**Solução**:
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://gigflow.com",
]
CORS_ALLOW_CREDENTIALS = True
```

---

### Problema: Cookies não estão sendo salvos

**Causa**: SameSite ou Secure configurados incorretamente

**Solução**:
```python
# Desenvolvimento (HTTP)
SIMPLE_JWT = {
    'AUTH_COOKIE_SECURE': False,  # HTTP permitido
    'AUTH_COOKIE_SAMESITE': 'Lax',
}

# Produção (HTTPS)
SIMPLE_JWT = {
    'AUTH_COOKIE_SECURE': True,   # Apenas HTTPS
    'AUTH_COOKIE_SAMESITE': 'Lax',
}
```

---

### Problema: Rate limiting bloqueando usuário legítimo

**Causa**: Muitas tentativas de login (>30/min)

**Solução**:
- Frontend: Mostrar mensagem clara com tempo de espera
- Backend: Ajustar throttle em `agenda/throttles.py` se necessário

---

## Variáveis de Ambiente Necessárias

### Backend (.env)
```bash
# JWT
SECRET_KEY=your-secret-key-here
SIMPLE_JWT_SIGNING_KEY=your-jwt-signing-key

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=your-google-client-id

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=gigflowagenda@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Diagramas de Fluxo

### Fluxo de Músico (Simplificado)

```
Músico → Solicitar Acesso → Email para Admin
  ↓
Admin → Aprovar → Email com Invite Token
  ↓
Músico → Clicar Link → Registrar com Token → Auto-login
  ↓
Dashboard
```

### Fluxo de Empresa (Simplificado)

```
Empresa → Registrar → Email de Boas-vindas
  ↓
Login (Email/Senha ou Google) → Dashboard
```

---

## Segurança

### Medidas Implementadas

✅ **Cookies httpOnly**: Tokens inacessíveis via JavaScript
✅ **SameSite cookies**: Proteção contra CSRF
✅ **Secure cookies**: Apenas HTTPS em produção
✅ **sessionStorage**: Limpa ao fechar navegador
✅ **Rate Limiting**: 30 tentativas/minuto
✅ **Password Validation**: Força mínima de senha
✅ **Token Expiration**: Access (5min), Refresh (24h)
✅ **Email Verification**: Emails transacionais para ações críticas

### Não Implementado (Melhorias Futuras)

⚠️ **2FA (Two-Factor Authentication)**: Aumentaria segurança
⚠️ **IP Whitelisting**: Para admin
⚠️ **Captcha**: Em formulários de registro/login
⚠️ **Audit Logs**: Registrar todas as ações de login/logout

---

## Endpoints de Autenticação

### Músicos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/musician-requests/` | Solicitar acesso |
| POST | `/api/register-with-invite/` | Registrar com convite |
| POST | `/api/token/` | Login |
| POST | `/api/token/refresh/` | Refresh token |
| POST | `/api/token/logout/` | Logout |
| GET | `/api/musicians/me/` | Dados do usuário logado |
| POST | `/api/password-reset/` | Solicitar reset de senha |
| POST | `/api/password-reset-confirm/` | Confirmar reset de senha |

### Empresas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/register-company/` | Registrar empresa |
| POST | `/api/company/token/` | Login |
| POST | `/api/auth/google/` | Login com Google |
| POST | `/api/token/refresh/` | Refresh token |
| POST | `/api/token/logout/` | Logout |
| GET | `/api/company/dashboard/` | Dados da empresa logada |
| PATCH | `/api/company/profile/` | Atualizar perfil |
| POST | `/api/password-reset/` | Solicitar reset de senha |
| POST | `/api/password-reset-confirm/` | Confirmar reset de senha |

### Admin

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/musician-requests/` | Listar solicitações |
| POST | `/api/admin/musician-requests/{id}/approve/` | Aprovar solicitação |
| POST | `/api/admin/musician-requests/{id}/reject/` | Rejeitar solicitação |

---

## Contato

**Email de Suporte**: gigflowagenda@gmail.com

**GitHub Issues**: Para reportar bugs ou sugerir melhorias

---

**Última atualização**: 28/01/2026
**Versão da documentação**: 1.0.0
