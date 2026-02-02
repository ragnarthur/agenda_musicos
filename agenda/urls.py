# agenda/urls.py
from django.conf import settings
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .admin_management_views import (
    create_admin_user,
    delete_admin_user,
    delete_user,
    get_admin_user,
    list_admin_users,
    list_all_users,
    list_organizations,
    reset_admin_password,
    update_admin_user,
)
from .admin_views import (
    admin_events_list,
    admin_reports,
    approve_booking_request,
    booking_request_detail,
    booking_requests_list,
    city_change_status,
    city_detail,
    city_list_create,
    dashboard_stats,
    dashboard_stats_extended,
    public_request_status,
    reject_booking_request,
    requests_by_city,
    requests_by_city_detail,
)
from .password_views import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
)
from .registration_views import (
    CheckEmailView,
    RegisterCompanyView,
    RegisterView,
    RegisterWithInviteView,
    update_avatar,
)
from .view_functions import (  # Musician Request views; Contact Request views; Public views; Company views
    approve_musician_request,
    archive_contact_request,
    create_contact_request,
    create_musician_request,
    get_company_dashboard,
    get_contact_request,
    get_musician_badges,
    get_musician_connection_status,
    get_musician_connections,
    get_musician_for_company,
    get_musician_public_profile,
    get_musician_request,
    get_musician_reviews,
    get_musician_stats,
    get_unread_messages_count,
    list_musician_requests,
    list_musicians_by_city,
    list_received_contact_requests,
    list_sent_contact_requests,
    list_sponsors,
    reject_musician_request,
    reply_contact_request,
    update_company_profile,
    upload_avatar,
    upload_cover,
    validate_invite_token,
)
from .views import (
    AvailabilityViewSet,
    BadgeViewSet,
    ConnectionViewSet,
    EventViewSet,
    InstrumentViewSet,
    LeaderAvailabilityViewSet,
    MusicianViewSet,
)

# Router do DRF gera automaticamente as URLs
router = DefaultRouter()
router.register("musicians", MusicianViewSet, basename="musician")
router.register("events", EventViewSet, basename="event")
router.register("availabilities", AvailabilityViewSet, basename="availability")
router.register(
    "leader-availabilities", LeaderAvailabilityViewSet, basename="leader-availability"
)
router.register("connections", ConnectionViewSet, basename="connection")
router.register("badges", BadgeViewSet, basename="badge")
router.register("instruments", InstrumentViewSet, basename="instrument")

urlpatterns = [
    # Registro de novos usuários (público)
    path("register/", RegisterView.as_view(), name="register"),
    path("check-email/", CheckEmailView.as_view(), name="check-email"),
    path(
        "register-with-invite/",
        RegisterWithInviteView.as_view(),
        name="register-with-invite",
    ),
    path("register-company/", RegisterCompanyView.as_view(), name="register-company"),
    path("musicians/avatar/", update_avatar, name="update-avatar"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password-reset-confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    # Image uploads
    path("musicians/upload-avatar/", upload_avatar, name="upload-avatar"),
    path("musicians/upload-cover/", upload_cover, name="upload-cover"),
    # Musician connections, reviews, badges, stats and connection-status
    path(
        "musicians/<int:musician_id>/connections/",
        get_musician_connections,
        name="musician-connections",
    ),
    path(
        "musicians/<int:musician_id>/reviews/",
        get_musician_reviews,
        name="musician-reviews",
    ),
    path(
        "musicians/<int:musician_id>/badges/",
        get_musician_badges,
        name="musician-badges",
    ),
    path(
        "musicians/<int:musician_id>/stats/", get_musician_stats, name="musician-stats"
    ),
    path(
        "musicians/<int:musician_id>/connection-status/",
        get_musician_connection_status,
        name="musician-connection-status",
    ),
    # =========================================================================
    # Musician Request (Solicitação de Acesso)
    # =========================================================================
    path("musician-request/", create_musician_request, name="musician-request-create"),
    path("validate-invite/", validate_invite_token, name="validate-invite"),
    # Admin - Gerenciar solicitações
    path(
        "admin/musician-requests/",
        list_musician_requests,
        name="admin-musician-requests",
    ),
    path(
        "admin/musician-requests/<int:request_id>/",
        get_musician_request,
        name="admin-musician-request-detail",
    ),
    path(
        "admin/musician-requests/<int:request_id>/approve/",
        approve_musician_request,
        name="admin-musician-request-approve",
    ),
    path(
        "admin/musician-requests/<int:request_id>/reject/",
        reject_musician_request,
        name="admin-musician-request-reject",
    ),
    # =========================================================================
    # Contact Requests (Mensagens de Empresas para Músicos)
    # =========================================================================
    path("contact-requests/", create_contact_request, name="contact-request-create"),
    path(
        "contact-requests/received/",
        list_received_contact_requests,
        name="contact-requests-received",
    ),
    path(
        "contact-requests/sent/",
        list_sent_contact_requests,
        name="contact-requests-sent",
    ),
    path(
        "contact-requests/<int:contact_id>/",
        get_contact_request,
        name="contact-request-detail",
    ),
    path(
        "contact-requests/<int:contact_id>/reply/",
        reply_contact_request,
        name="contact-request-reply",
    ),
    path(
        "contact-requests/<int:contact_id>/archive/",
        archive_contact_request,
        name="contact-request-archive",
    ),
    # =========================================================================
    # Public (Músicos por cidade, Patrocinadores, Perfil público)
    # =========================================================================
    path("musicians/public-by-city/", list_musicians_by_city, name="musicians-by-city"),
    path(
        "musicians/public/<int:musician_id>/",
        get_musician_public_profile,
        name="musician-public-profile",
    ),
    path("organizations/sponsors/", list_sponsors, name="sponsors"),
    # =========================================================================
    # Company (Dashboard, Perfil, Músicos)
    # =========================================================================
    path("company/dashboard/", get_company_dashboard, name="company-dashboard"),
    path("company/profile/", update_company_profile, name="company-profile"),
    path(
        "company/musicians/<int:musician_id>/",
        get_musician_for_company,
        name="company-musician-detail",
    ),
    # =========================================================================
    # Messages
    # =========================================================================
    path(
        "messages/unread-count/",
        get_unread_messages_count,
        name="messages-unread-count",
    ),
    # =========================================================================
    # Admin Dashboard
    # =========================================================================
    path(
        "admin/dashboard-stats/",
        dashboard_stats,
        name="admin-dashboard-stats",
    ),
    path(
        "admin/booking-requests/",
        booking_requests_list,
        name="admin-booking-requests",
    ),
    path(
        "admin/booking-requests/<int:pk>/",
        booking_request_detail,
        name="admin-booking-request-detail",
    ),
    path(
        "admin/booking-requests/<int:pk>/approve/",
        approve_booking_request,
        name="admin-booking-request-approve",
    ),
    path(
        "admin/booking-requests/<int:pk>/reject/",
        reject_booking_request,
        name="admin-booking-request-reject",
    ),
    path(
        "admin/events/",
        admin_events_list,
        name="admin-events",
    ),
    path(
        "admin/reports/",
        admin_reports,
        name="admin-reports",
    ),
    # =========================================================================
    # Admin - Extended Stats & City Management
    # =========================================================================
    path(
        "admin/dashboard-stats-extended/",
        dashboard_stats_extended,
        name="admin-dashboard-stats-extended",
    ),
    path(
        "admin/requests-by-city/",
        requests_by_city,
        name="admin-requests-by-city",
    ),
    path(
        "admin/requests-by-city/<str:city>/<str:state>/",
        requests_by_city_detail,
        name="admin-requests-by-city-detail",
    ),
    path(
        "admin/cities/",
        city_list_create,
        name="admin-cities",
    ),
    path(
        "admin/cities/<int:pk>/",
        city_detail,
        name="admin-city-detail",
    ),
    path(
        "admin/cities/<int:pk>/change-status/",
        city_change_status,
        name="admin-city-change-status",
    ),
    # =========================================================================
    # Admin - User Management
    # =========================================================================
    path("admin/users/all/", list_all_users, name="admin-all-users-list"),
    path("admin/users/", list_admin_users, name="admin-users-list"),
    path(
        "admin/organizations/",
        list_organizations,
        name="admin-organizations-list",
    ),
    path("admin/users/<int:pk>/", get_admin_user, name="admin-users-detail"),
    path("admin/users/create/", create_admin_user, name="admin-users-create"),
    path("admin/users/<int:pk>/update/", update_admin_user, name="admin-users-update"),
    path(
        "admin/users/<int:pk>/delete/",
        delete_admin_user,
        name="admin-users-delete",
    ),
    path(
        "admin/users/<int:pk>/reset-password/",
        reset_admin_password,
        name="admin-users-reset-password",
    ),
    path(
        "users/<int:pk>/delete/",
        delete_user,
        name="user-delete",
    ),
    # =========================================================================
    # Public Status Page
    # =========================================================================
    path(
        "public/request-status/",
        public_request_status,
        name="public-request-status",
    ),
    path("", include(router.urls)),
]

"""
URLs geradas automaticamente:

MUSICIANS:
- GET    /api/musicians/           - Lista todos os músicos
- GET    /api/musicians/{id}/      - Detalhe de um músico
- GET    /api/musicians/me/        - Perfil do músico logado
- GET    /api/musicians/{id}/connections/       - Conexões do músico
- GET    /api/musicians/{id}/reviews/           - Avaliações do músico
- GET    /api/musicians/{id}/badges/            - Badges do músico
- GET    /api/musicians/{id}/stats/             - Estatísticas do músico
- GET    /api/musicians/{id}/connection-status/ - Status de conexão com o músico

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
