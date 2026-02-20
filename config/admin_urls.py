from django.urls import path

from agenda.admin_views import (
    approve_booking_request,
    booking_request_detail,
    booking_requests_list,
    reject_booking_request,
    requests_by_city,
    requests_by_city_detail,
)

urlpatterns = [
    # Booking Requests (alternative path: /api/admin/requests/)
    path("requests/", booking_requests_list, name="admin-requests"),
    path("requests/<int:pk>/", booking_request_detail, name="admin-request-detail"),
    path(
        "requests/<int:pk>/approve/",
        approve_booking_request,
        name="admin-request-approve",
    ),
    path("requests/<int:pk>/reject/", reject_booking_request, name="admin-request-reject"),
    # City Stats (alternative path: /api/admin/cities/stats/)
    path("cities/stats/", requests_by_city, name="admin-cities-stats"),
    path(
        "cities/stats/<str:city>/<str:state>/",
        requests_by_city_detail,
        name="admin-city-requests-detail",
    ),
]
