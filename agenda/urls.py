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
    upload_avatar,
    upload_cover,
    get_musician_connections,
    get_musician_reviews,
)
from .registration_views import (
    RegisterView,
    VerifyEmailView,
    RegistrationStatusView,
    ProcessPaymentView,
    ResendVerificationView,
    StartTrialView,
    SubscriptionCheckoutView,
    SubscriptionActivateView,
    SubscriptionActivateFakeView,
    PaymentCallbackView,
    SubscriptionStatusUpdateView,
)
from .password_views import (
    PasswordResetRequestView,
    PasswordResetConfirmView,
)
from django.conf import settings

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
    # Pagamento fictício só disponível quando Stripe está desativado
    path('process-payment/', ProcessPaymentView.as_view(), name='process-payment'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),
    path('start-trial/', StartTrialView.as_view(), name='start-trial'),
    path('subscription-checkout/', SubscriptionCheckoutView.as_view(), name='subscription-checkout'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    # Callbacks do Payment Service (chamados pelo microserviço)
    path('subscription-activate/', SubscriptionActivateView.as_view(), name='subscription-activate'),
    path('subscription-activate-fake/', SubscriptionActivateFakeView.as_view(), name='subscription-activate-fake'),
    path('payment-callback/', PaymentCallbackView.as_view(), name='payment-callback'),
    path('subscription-status-update/', SubscriptionStatusUpdateView.as_view(), name='subscription-status-update'),
    # Image uploads
    path('musicians/upload-avatar/', upload_avatar, name='upload-avatar'),
    path('musicians/upload-cover/', upload_cover, name='upload-cover'),
    # Musician connections and reviews
    path('musicians/<int:musician_id>/connections/', get_musician_connections, name='musician-connections'),
    path('musicians/<int:musician_id>/reviews/', get_musician_reviews, name='musician-reviews'),
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
- POST   /api/events/{id}/approve/ - Confirma participação do convidado (compat)
- POST   /api/events/{id}/reject/  - Recusa participação do convidado (compat)
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
