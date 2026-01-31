from django.urls import path
from agenda.admin_views import (
    # Stats
    dashboard_stats,
    dashboard_stats_extended,
    admin_reports,
    # Requests
    booking_requests_list,
    booking_request_detail,
    approve_booking_request,
    reject_booking_request,
    # Events
    admin_events_list,
    # Cities
    requests_by_city,
    requests_by_city_detail,
    city_list_create,
    city_detail,
    city_change_status,
)

urlpatterns = [
    # Dashboard & Stats
    path("dashboard/stats/", dashboard_stats, name="admin-dashboard-stats"),
    path(
        "dashboard/stats-extended/",
        dashboard_stats_extended,
        name="admin-dashboard-stats-extended",
    ),
    path("reports/", admin_reports, name="admin-reports"),
    # Booking Requests
    path("requests/", booking_requests_list, name="admin-requests"),
    path("requests/<int:pk>/", booking_request_detail, name="admin-request-detail"),
    path(
        "requests/<int:pk>/approve/",
        approve_booking_request,
        name="admin-request-approve",
    ),
    path(
        "requests/<int:pk>/reject/", reject_booking_request, name="admin-request-reject"
    ),
    # Events
    path("events/", admin_events_list, name="admin-events"),
    # Cities
    path("cities/stats/", requests_by_city, name="admin-cities-stats"),
    path(
        "cities/stats/<str:city>/<str:state>/",
        requests_by_city_detail,
        name="admin-city-requests-detail",
    ),
    path("cities/", city_list_create, name="admin-cities"),
    path("cities/<int:pk>/", city_detail, name="admin-city-detail"),
    path(
        "cities/<int:pk>/change-status/",
        city_change_status,
        name="admin-city-change-status",
    ),
]
