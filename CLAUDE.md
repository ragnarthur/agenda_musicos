# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agenda Músicos** is a band event management system built as a Django REST + React/TypeScript application. Musicians (Sara, Arthur) create event proposals that need approval from the band leader (Roberto, the drummer). The system manages event schedules, musician availability, and coordinates shows.

## Architecture

### Backend (Django REST Framework)

- **Tech Stack**: Django 5.2, DRF 3.16, SimpleJWT, SQLite (dev), PostgreSQL (prod)
- **Structure**: Single Django app called `agenda` within `config` project
- **Authentication**: JWT tokens (5h access, 7d refresh)
- **Language**: Portuguese (pt-br)
- **Timezone**: America/Sao_Paulo

### Frontend (React + TypeScript)

- **Tech Stack**: React 19, TypeScript, Vite, TailwindCSS, Axios, React Router
- **Structure**: Standard Vite React app in `/frontend` directory
- **Build Output**: Static files copied to backend's `staticfiles/`

### Deployment

- **Development**: Django dev server (8000) + Vite dev server (5173)
- **Production**: Gunicorn + nginx serving both API and static frontend
- **Access via ngrok**: Public tunnel for testing (URL in session context)

## Core Domain Models

### 1. **Musician** (agenda/models.py:8-50)
   - Links to Django User (OneToOne)
   - Has `instrument` (vocal/guitar/bass/drums/keyboard/other)
   - Has `role` (member/leader) - Roberto is the leader
   - Method: `is_leader()` returns True if role='leader'

### 2. **Event** (agenda/models.py:52-185)
   - Event proposals created by musicians
   - **Status flow**: proposed → approved (by leader) → confirmed → cancelled
   - **Special**: `is_solo=True` events auto-approve (no leader needed)
   - Auto-combines `event_date` + `start_time`/`end_time` into datetime fields
   - Methods: `approve(user)`, `reject(user, reason)`

### 3. **Availability** (agenda/models.py:187-237)
   - Tracks each musician's response to an event
   - Response types: pending/available/unavailable/maybe
   - Created automatically when event is proposed
   - Only creator + Roberto (leader) get availability records (not all band members)

### 4. **LeaderAvailability** (agenda/models.py:239-337)
   - Leader posts available dates/times
   - **40-minute buffer rule**: `get_conflicting_events()` checks for conflicts with 40min gaps
   - Frontend shows these when musicians create events
   - Method: `has_conflicts()` returns boolean

## Critical Business Logic

### Event Creation Flow (agenda/views.py:129-181)

```
1. Musician creates event proposal
2. If is_solo=True:
   - Set status='approved' immediately
   - Create availability only for creator
3. If is_solo=False (band event):
   - Set status='proposed'
   - Create availability for creator (response='available')
   - Create availability for Roberto/leader (response='pending')
4. Availabilities created via bulk_create
```

**Key**: Roberto (username='roberto') is hardcoded as the leader/drummer.

### Leader Approval Flow (agenda/views.py:182-248)

- Only users with `role='leader'` can approve/reject
- Approval changes status: proposed → approved
- Rejection stores reason in `rejection_reason` field

### Solo Events Feature

Solo events bypass leader approval:
- Set `is_solo=True` in event creation
- Status becomes 'approved' automatically
- No availability created for Roberto
- Frontend shows different UI (blue checkbox, auto-approval notice)

### Leader Availability System

40-minute buffer between events:
- `LeaderAvailability.get_conflicting_events()` adds 40min before/after using timedelta
- Frontend shows green success when date matches availability
- Conflict warnings shown in red on leader availability page

## Development Commands

### Backend

```bash
# Virtual environment
source .venv/bin/activate

# Run development server
python manage.py runserver 0.0.0.0:8000

# Database migrations
python manage.py makemigrations
python manage.py migrate

# Django shell (useful for data manipulation)
python manage.py shell

# Create superuser
python manage.py createsuperuser

# Reset user password (in shell)
from django.contrib.auth.models import User
user = User.objects.get(username='arthur')
user.set_password('arthur123')
user.save()

# Run tests
python manage.py test

# Run comprehensive workflow tests
python test_complete_workflow.py
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Development server (with hot reload)
npm run dev

# Production build (outputs to dist/)
npm run build

# Lint
npm run lint
```

### Full Stack Development

**Local development** (two terminals):
```bash
# Terminal 1: Backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Production build & deploy**:
```bash
# Build frontend
cd frontend && npm run build

# Copy to Django static
# (Usually handled by deployment script)

# Collect static files
python manage.py collectstatic --noinput

# Restart Gunicorn (on server)
sudo systemctl restart gunicorn
# OR find PID and kill -HUP <pid>
```

## API Endpoints

All endpoints prefixed with `/api/`

### Authentication
- `POST /api/token/` - Login (get access + refresh tokens)
- `POST /api/token/refresh/` - Refresh access token

### Musicians
- `GET /api/musicians/` - List all musicians
- `GET /api/musicians/me/` - Current user's musician profile
- `GET /api/musicians/{id}/` - Get musician by ID

### Events
- `GET /api/events/` - List events (filterable: ?status=proposed&upcoming=true)
- `POST /api/events/` - Create event proposal
- `GET /api/events/{id}/` - Event detail with availabilities
- `PUT /api/events/{id}/` - Update event (only creator)
- `DELETE /api/events/{id}/` - Delete event (only creator)
- `POST /api/events/{id}/approve/` - Approve (leader only)
- `POST /api/events/{id}/reject/` - Reject with reason (leader only)
- `POST /api/events/{id}/cancel/` - Cancel event (creator only)
- `POST /api/events/{id}/set_availability/` - Mark availability
- `GET /api/events/my_events/` - Events where I have availability
- `GET /api/events/pending_my_response/` - Events awaiting my response

### Leader Availabilities
- `GET /api/leader-availabilities/` - List (filterable: ?upcoming=true)
- `POST /api/leader-availabilities/` - Create (leader only)
- `GET /api/leader-availabilities/{id}/` - Get availability
- `PUT /api/leader-availabilities/{id}/` - Update (leader only)
- `DELETE /api/leader-availabilities/{id}/` - Delete (leader only)
- `GET /api/leader-availabilities/{id}/conflicting_events/` - Get conflicts

### Availabilities
- `GET /api/availabilities/` - My availabilities
- `PUT /api/availabilities/{id}/` - Update my availability

## Frontend Architecture

### Routing (frontend/src/App.tsx)

- `/login` - Login page (public)
- `/` - Dashboard (protected)
- `/eventos` - Events list (protected)
- `/eventos/novo` - Create event (protected)
- `/eventos/:id` - Event detail (protected)
- `/eventos/:id/editar` - Edit event (protected)
- `/musicos` - Musicians list (protected)
- `/aprovacoes` - Approvals page (leader only)
- `/disponibilidades` - Leader availability management (leader only)

### State Management

**AuthContext** (frontend/src/contexts/AuthContext.tsx):
- Manages JWT tokens in localStorage
- Provides: user, isAuthenticated, isLeader, login(), logout()
- Auto-refreshes tokens via axios interceptor

### API Service Layer (frontend/src/services/api.ts)

Centralized axios instance with:
- Auto token injection from localStorage
- Auto token refresh on 401
- Base URL from VITE_API_URL env var (defaults to localhost:8000)

### Key Components

**EventForm** (frontend/src/pages/EventForm.tsx):
- Shows leader availabilities as clickable cards
- Green success message when date matches availability
- Blue "Show Solo" checkbox
- Phone number auto-formatting for venue_contact

**EventEditForm** (frontend/src/pages/EventEditForm.tsx):
- IMPORTANT: Always initialize `is_solo: false` in initial state
- Use nullish coalescing: `event.is_solo ?? false` when loading

**LeaderAvailability** (frontend/src/pages/LeaderAvailability.tsx):
- Full CRUD for leader availabilities
- Shows conflict warnings in red
- Info about 40-minute buffer rule

**Navbar** (frontend/src/components/Layout/Navbar.tsx):
- Badge counts for pending responses
- Leader-only links (Aprovações, Disponibilidades)
- Polls for notifications every 30 seconds

## Important Patterns

### TypeScript Types (frontend/src/types/index.ts)

- All backend models have corresponding TypeScript interfaces
- Separate interfaces for creation (e.g., `EventCreate`, `LeaderAvailabilityCreate`)
- Use `export type` for union types (AvailabilityResponse, EventStatus)

### Date/Time Handling

**Backend**:
- Django timezone-aware datetimes
- Auto-combines date + time in model.save()
- Validation prevents past dates

**Frontend**:
- HTML5 date/time inputs (YYYY-MM-DD format)
- date-fns for formatting displays
- `.slice(0, 5)` to show HH:MM from HH:MM:SS

### Permissions (agenda/permissions.py)

- `IsLeaderOrReadOnly`: Only leaders can write, all can read
- `IsOwnerOrReadOnly`: Only creator can write, all can read
- Applied at ViewSet level with `get_permissions()`

## Common Pitfalls

1. **Event Edit Form Bug**: Always initialize `is_solo: false` in state, use `?? false` when loading
2. **Roberto Hardcoded**: System assumes username='roberto' exists as the leader
3. **Availability Creation**: Only creator + Roberto get availabilities (not all musicians)
4. **Date Format**: Backend expects YYYY-MM-DD, time as HH:MM or HH:MM:SS
5. **CORS**: Development requires frontend origin in ALLOWED_ORIGINS (default: localhost:5173)
6. **Status Display**: Use `.get('status_display')` with fallback in API responses (EventCreateSerializer doesn't include it)

## Testing

Test script: `test_complete_workflow.py`
- Comprehensive end-to-end tests
- Tests: login, create regular event, create solo event, approve, edit, leader availability CRUD, delete
- Default credentials: arthur/arthur123, roberto/roberto123, sara/sara123

## Environment Variables

**Backend** (.env in root):
```
SECRET_KEY=<django-secret>
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,<ngrok-host>
```

**Frontend** (frontend/.env):
```
VITE_API_URL=http://localhost:8000/api
# Or for ngrok: VITE_API_URL=https://<ngrok-url>/api
```

## Database Management

**Reset data** (Django shell):
```python
from agenda.models import Event, Availability, LeaderAvailability
Event.objects.all().delete()
Availability.objects.all().delete()
LeaderAvailability.objects.all().delete()
```

**Populate test data**:
```bash
python manage.py populate_db  # If management command exists
```

## Deployment Notes

**Server setup** (production):
- SSH into server: `ssh -p 2025 planejai-server@45.237.131.177`
- Project location: `/tmp/agenda-musicos/` (check actual path)
- Gunicorn process: Find PID, then `kill -HUP <pid>` to reload
- Static files: Must run `collectstatic` after frontend build
- Database: Check if using PostgreSQL or SQLite in production

**Deployment flow**:
1. Commit changes locally
2. Push to GitHub
3. SSH to server
4. `git pull` in project directory
5. `python manage.py migrate` (if models changed)
6. `cd frontend && npm run build`
7. `python manage.py collectstatic --noinput`
8. Reload Gunicorn

## Code Style

- Backend: Django/Python conventions, docstrings in Portuguese for domain logic
- Frontend: TypeScript strict mode, functional components with hooks
- Comments: Mix of English (technical) and Portuguese (business logic)
- No emojis in code (except in user-facing text like commit messages with 🤖)
