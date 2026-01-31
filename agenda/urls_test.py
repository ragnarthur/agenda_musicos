# agenda/urls.py (simplificado para teste)
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .admin_management_views import (
    create_admin_user,
    delete_admin_user,
    get_admin_user,
    list_admin_users,
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
from .views import (
    AvailabilityViewSet,
    BadgeViewSet,
    ConnectionViewSet,
    EventViewSet,
    InstrumentViewSet,
    LeaderAvailabilityViewSet,
    MusicianViewSet,
)

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
    # Router
    path("", include(router.urls)),
    # Admin - Dashboard & Stats
    path(
        "admin/dashboard-stats/",
        dashboard_stats,
        name="admin-dashboard-stats",
    ),
    path(
        "admin/dashboard-stats-extended/",
        dashboard_stats_extended,
        name="admin-dashboard-stats-extended",
    ),
    # Admin - Booking Requests
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
    # Admin - Events
    path("admin/events/", admin_events_list, name="admin-events"),
    # Admin - Reports
    path("admin/reports/", admin_reports, name="admin-reports"),
    # Admin - Cities
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
    path("admin/cities/", city_list_create, name="admin-cities"),
    path("admin/cities/<int:pk>/", city_detail, name="admin-city-detail"),
    path(
        "admin/cities/<int:pk>/change-status/",
        city_change_status,
        name="admin-city-change-status",
    ),
    # Admin - User Management (apenas owners)
    path("admin/users/", list_admin_users, name="admin-users-list"),
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
    # Public
    path(
        "public/request-status/",
        public_request_status,
        name="public-request-status",
    ),
]
