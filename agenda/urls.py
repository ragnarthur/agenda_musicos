# agenda/urls.py
from django.conf import settings
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .admin_management_views import (
    contact_views_stats,
    create_admin_user,
    delete_admin_user,
    delete_contractor,
    delete_organization,
    delete_user,
    get_admin_user,
    list_admin_users,
    list_all_users,
    list_contact_views,
    list_contractors,
    list_organizations,
    reset_admin_password,
    set_premium,
    toggle_premium,
    update_admin_user,
)
from .admin_views import (
    admin_cancel_booking,
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
    get_booking_statistics,
    get_quote_request_audit,
    list_all_quote_requests,
    public_request_status,
    reject_booking_request,
    requests_by_city,
    requests_by_city_detail,
)
from .password_views import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
)
from .premium_views import (  # noqa: E402
    admin_cultural_notice_detail,
    admin_cultural_notice_suggestions,
    admin_cultural_notices,
    admin_import_cultural_notice_suggestions,
    admin_og_preview,
    premium_portal,
)
from .registration_views import (
    CheckEmailView,
    RegisterContractorView,
    RegisterView,
    RegisterWithInviteView,
    update_avatar,
)
from .view_functions import (  # Musician Request views; Quote Request views; Public views; Contractor views
    approve_musician_request,
    cancel_booking,
    cancel_quote_request,
    collect_pwa_analytics,
    collect_web_vitals,
    contractor_accept_proposal,
    create_musician_request,
    create_quote_request,
    decline_quote_proposal,
    get_contractor_dashboard,
    get_musician_badges,
    get_musician_connection_status,
    get_musician_connections,
    get_musician_contact,
    get_musician_public_profile,
    get_musician_request,
    get_musician_reviews,
    get_musician_stats,
    get_quote_request,
    get_unread_messages_count,
    list_all_musicians_public,
    list_available_musical_genres,
    list_contractor_quote_requests,
    list_musician_quote_requests,
    list_musician_requests,
    list_musicians_by_city,
    list_quote_proposals,
    list_sponsors,
    musician_confirm_booking,
    musician_send_proposal,
    reject_musician_request,
    resend_musician_request_invite,
    update_contractor_profile,
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
router.register("leader-availabilities", LeaderAvailabilityViewSet, basename="leader-availability")
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
    path(
        "register-contractor/",
        RegisterContractorView.as_view(),
        name="register-contractor",
    ),
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
    path("musicians/<int:musician_id>/stats/", get_musician_stats, name="musician-stats"),
    path(
        "musicians/<int:musician_id>/connection-status/",
        get_musician_connection_status,
        name="musician-connection-status",
    ),
    path(
        "musicians/<int:musician_id>/contact/",
        get_musician_contact,
        name="musician-contact",
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
        "admin/musician-requests/<int:request_id>/resend/",
        resend_musician_request_invite,
        name="admin-musician-request-resend",
    ),
    path(
        "admin/musician-requests/<int:request_id>/reject/",
        reject_musician_request,
        name="admin-musician-request-reject",
    ),
    # =========================================================================
    # Quote Requests (Contratantes -> Músicos)
    # =========================================================================
    path("quotes/", create_quote_request, name="quote-request-create"),
    path(
        "quotes/contractor/",
        list_contractor_quote_requests,
        name="quote-requests-contractor",
    ),
    path(
        "quotes/musician/",
        list_musician_quote_requests,
        name="quote-requests-musician",
    ),
    path(
        "quotes/<int:request_id>/",
        get_quote_request,
        name="quote-request-detail",
    ),
    path(
        "quotes/<int:request_id>/proposal/",
        musician_send_proposal,
        name="quote-request-proposal",
    ),
    path(
        "quotes/<int:request_id>/accept/",
        contractor_accept_proposal,
        name="quote-request-accept",
    ),
    path(
        "quotes/<int:request_id>/confirm/",
        musician_confirm_booking,
        name="quote-request-confirm",
    ),
    path(
        "quotes/<int:request_id>/proposals/",
        list_quote_proposals,
        name="quote-request-proposals",
    ),
    path(
        "quotes/<int:request_id>/proposals/<int:proposal_id>/decline/",
        decline_quote_proposal,
        name="quote-proposal-decline",
    ),
    path(
        "quotes/<int:request_id>/cancel/",
        cancel_quote_request,
        name="quote-request-cancel",
    ),
    path(
        "bookings/<int:request_id>/cancel/",
        cancel_booking,
        name="booking-cancel",
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
    path(
        "musicians/genres/",
        list_available_musical_genres,
        name="musicians-genres",
    ),
    path("organizations/sponsors/", list_sponsors, name="sponsors"),
    path("musicians/all/", list_all_musicians_public, name="musicians-all"),
    path("analytics/pwa/", collect_pwa_analytics, name="analytics-pwa"),
    path("vitals/", collect_web_vitals, name="web-vitals"),
    # =========================================================================
    # Contractor (Dashboard, Perfil)
    # =========================================================================
    path("contractor/dashboard/", get_contractor_dashboard, name="contractor-dashboard"),
    path("contractor/profile/", update_contractor_profile, name="contractor-profile"),
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
        "admin/quote-requests/",
        list_all_quote_requests,
        name="admin-quote-requests",
    ),
    path(
        "admin/quote-requests/<int:request_id>/audit/",
        get_quote_request_audit,
        name="admin-quote-request-audit",
    ),
    path(
        "admin/bookings/<int:request_id>/cancel/",
        admin_cancel_booking,
        name="admin-booking-cancel",
    ),
    path(
        "admin/booking-stats/",
        get_booking_statistics,
        name="admin-booking-stats",
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
    path("admin/contractors/", list_contractors, name="admin-contractors-list"),
    path(
        "admin/contractors/<int:pk>/delete/",
        delete_contractor,
        name="admin-contractors-delete",
    ),
    path(
        "admin/organizations/",
        list_organizations,
        name="admin-organizations-list",
    ),
    path(
        "admin/organizations/<int:pk>/delete/",
        delete_organization,
        name="admin-organizations-delete",
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
        "admin/users/<int:pk>/set-premium/",
        set_premium,
        name="admin-users-set-premium",
    ),
    path(
        "admin/users/<int:pk>/toggle-premium/",
        toggle_premium,
        name="admin-users-toggle-premium",
    ),
    path(
        "users/<int:pk>/delete/",
        delete_user,
        name="user-delete",
    ),
    # =========================================================================
    # Admin - Contact Views Audit
    # =========================================================================
    path(
        "admin/contact-views/",
        list_contact_views,
        name="admin-contact-views",
    ),
    path(
        "admin/contact-views/stats/",
        contact_views_stats,
        name="admin-contact-views-stats",
    ),
    path(
        "admin/cultural-notices/og-preview/",
        admin_og_preview,
        name="admin-cultural-notices-og-preview",
    ),
    path(
        "admin/cultural-notices/",
        admin_cultural_notices,
        name="admin-cultural-notices",
    ),
    path(
        "admin/cultural-notices/<int:notice_id>/",
        admin_cultural_notice_detail,
        name="admin-cultural-notice-detail",
    ),
    path(
        "admin/cultural-notices/suggestions/",
        admin_cultural_notice_suggestions,
        name="admin-cultural-notice-suggestions",
    ),
    path(
        "admin/cultural-notices/import-suggestions/",
        admin_import_cultural_notice_suggestions,
        name="admin-cultural-notice-import-suggestions",
    ),
    # =========================================================================
    # Public Status Page
    # =========================================================================
    path(
        "public/request-status/",
        public_request_status,
        name="public-request-status",
    ),
    # =========================================================================
    # Premium — Portal Cultural (apenas músicos com is_premium=True)
    # =========================================================================
    path("premium/portal/", premium_portal, name="premium-portal"),
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
