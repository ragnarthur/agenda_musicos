# Agenda de Músicos - Backend Django

Sistema de gerenciamento de agenda para banda, com controle de eventos, disponibilidade de músicos e aprovação de shows.

## 🎵 Músicos Cadastrados

O banco de dados já está populado com os seguintes usuários:

### Sara Silva - Vocalista (Membro)
- **Username:** `sara`
- **Password:** `senha123`
- **Email:** sara@banda.com
- **Instrumento:** Vocal
- **Telefone:** (11) 98888-1111

### Arthur Araújo - Guitarrista (Membro)
- **Username:** `arthur`
- **Password:** `senha123`
- **Email:** arthur@banda.com
- **Instrumento:** Guitarra
- **Telefone:** (11) 98888-2222

### Roberto Oliveira - Baterista (👑 LÍDER)
- **Username:** `roberto`
- **Password:** `senha123`
- **Email:** roberto@banda.com
- **Instrumento:** Bateria
- **Telefone:** (11) 98888-3333
- **Permissões especiais:** Pode aprovar/rejeitar eventos

## 🚀 Como Iniciar o Servidor

```bash
# Ativar ambiente virtual
source .venv/bin/activate

# Rodar servidor
python manage.py runserver
```

O servidor estará disponível em: **http://localhost:8000**

## 🔐 Autenticação JWT

### Obter Token de Acesso

```bash
POST http://localhost:8000/api/token/
Content-Type: application/json

{
  "username": "sara",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Renovar Token

```bash
POST http://localhost:8000/api/token/refresh/
Content-Type: application/json

{
  "refresh": "seu_refresh_token_aqui"
}
```

### Usar Token nas Requisições

Adicione o header:
```
Authorization: Bearer seu_access_token_aqui
```

## 📡 Endpoints da API

### Músicos

- `GET /api/musicians/` - Lista todos os músicos
- `GET /api/musicians/{id}/` - Detalhe de um músico
- `GET /api/musicians/me/` - Perfil do músico logado

### Eventos

- `GET /api/events/` - Lista eventos
- `POST /api/events/` - Cria proposta de evento
- `GET /api/events/{id}/` - Detalhe de um evento
- `PUT /api/events/{id}/` - Atualiza evento
- `DELETE /api/events/{id}/` - Deleta evento
- `POST /api/events/{id}/approve/` - Aprova evento (apenas líderes)
- `POST /api/events/{id}/reject/` - Rejeita evento (apenas líderes)
- `POST /api/events/{id}/set_availability/` - Marca disponibilidade
- `GET /api/events/my_events/` - Eventos do usuário
- `GET /api/events/pending_my_response/` - Eventos aguardando resposta

### Disponibilidades

- `GET /api/availabilities/` - Lista suas disponibilidades
- `POST /api/availabilities/` - Cria disponibilidade
- `GET /api/availabilities/{id}/` - Detalhe
- `PUT /api/availabilities/{id}/` - Atualiza
- `DELETE /api/availabilities/{id}/` - Deleta

## 📝 Exemplo de Fluxo

### 1. Sara cria uma proposta de evento

```bash
POST /api/events/
Authorization: Bearer {token_da_sara}
Content-Type: application/json

{
  "title": "Show no Bar do Zé",
  "description": "Show beneficente",
  "location": "Rua das Flores, 123",
  "event_date": "2025-12-15",
  "start_time": "20:00:00",
  "end_time": "23:00:00",
  "payment_amount": "500.00"
}
```

### 2. Sistema cria availabilities para todos os músicos automaticamente

### 3. Roberto (líder) aprova o evento

```bash
POST /api/events/{id}/approve/
Authorization: Bearer {token_do_roberto}
```

### 4. Músicos marcam disponibilidade

```bash
POST /api/events/{id}/set_availability/
Authorization: Bearer {token_do_musico}
Content-Type: application/json

{
  "response": "available",
  "notes": "Posso tocar!"
}
```

Opções de `response`:
- `pending` - Ainda não respondeu
- `available` - Disponível
- `unavailable` - Indisponível
- `maybe` - Talvez

## 🛠️ Comandos Úteis

### Popular banco de dados novamente
```bash
python manage.py populate_db
```

### Rodar testes
```bash
python manage.py test
```

### Testar autenticação
```bash
python test_auth.py
```

### Criar superusuário para Django Admin
```bash
python manage.py createsuperuser
```

### Acessar Django Admin
```
http://localhost:8000/admin/
```

## 📊 Status dos Eventos

- `proposed` - Proposta enviada (aguardando aprovação do líder)
- `approved` - Aprovada pelo líder
- `rejected` - Rejeitada pelo líder
- `confirmed` - Confirmada (todos disponíveis)
- `cancelled` - Cancelada

## 🔒 Permissões

- **Membros (Sara, Arthur):**
  - Criar propostas de eventos
  - Marcar própria disponibilidade
  - Ver todos os eventos

- **Líder (Roberto):**
  - Todas as permissões de membros
  - Aprovar eventos
  - Rejeitar eventos

## ✅ Backend Pronto!

O backend está **100% funcional** e pronto para integração com o frontend.

Todos os testes estão passando (9/9) e os usuários já estão cadastrados no banco de dados.
