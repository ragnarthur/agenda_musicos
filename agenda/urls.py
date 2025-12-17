# agenda/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MusicianViewSet,
    EventViewSet,
    AvailabilityViewSet,
    LeaderAvailabilityViewSet,
    ConnectionViewSet,
    BadgeViewSet,
)
from .registration_views import (
    RegisterView,
    VerifyEmailView,
    RegistrationStatusView,
    ProcessPaymentView,
    ResendVerificationView,
)

# Router do DRF gera automaticamente as URLs
router = DefaultRouter()
router.register('musicians', MusicianViewSet, basename='musician')
router.register('events', EventViewSet, basename='event')
router.register('availabilities', AvailabilityViewSet, basename='availability')
router.register('leader-availabilities', LeaderAvailabilityViewSet, basename='leader-availability')
router.register('connections', ConnectionViewSet, basename='connection')
router.register('badges', BadgeViewSet, basename='badge')

urlpatterns = [
    path('', include(router.urls)),
    # Registro de novos usuários (público)
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('registration-status/', RegistrationStatusView.as_view(), name='registration-status'),
    path('process-payment/', ProcessPaymentView.as_view(), name='process-payment'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),
]

"""
URLs geradas automaticamente:

MUSICIANS:
- GET    /api/musicians/           - Lista todos os músicos
- GET    /api/musicians/{id}/      - Detalhe de um músico
- GET    /api/musicians/me/        - Perfil do músico logado

EVENTS:
- GET    /api/events/              - Lista eventos
- POST   /api/events/              - Cria proposta de evento
- GET    /api/events/{id}/         - Detalhe de um evento
- PUT    /api/events/{id}/         - Atualiza evento
- DELETE /api/events/{id}/         - Deleta evento
- POST   /api/events/{id}/approve/ - Aprova evento (apenas líderes)
- POST   /api/events/{id}/reject/  - Rejeita evento (apenas líderes)
- POST   /api/events/{id}/set_availability/ - Marca disponibilidade
- GET    /api/events/my_events/    - Eventos do usuário
- GET    /api/events/pending_my_response/ - Eventos aguardando resposta

AVAILABILITIES:
- GET    /api/availabilities/      - Lista suas disponibilidades
- POST   /api/availabilities/      - Cria disponibilidade
- GET    /api/availabilities/{id}/ - Detalhe
- PUT    /api/availabilities/{id}/ - Atualiza
- DELETE /api/availabilities/{id}/ - Deleta
"""
