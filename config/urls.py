"""
URL configuration for config project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from config.auth_views import (
    AdminMeView,
    AdminTokenObtainPairView,
    ContractorTokenObtainPairView,
    CookieTokenLogoutView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    GoogleAuthView,
    GoogleRegisterMusicianView,
)


def healthz(_request):
    return JsonResponse({"status": "ok"})


def readyz(_request):
    checks = {"database": "ok", "cache": "ok"}
    status_code = 200

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        checks["database"] = "error"
        status_code = 503

    try:
        cache_key = "readyz:ping"
        cache.set(cache_key, "1", timeout=10)
        if cache.get(cache_key) != "1":
            raise RuntimeError("cache ping failed")
    except Exception:
        checks["cache"] = "error"
        status_code = 503

    return JsonResponse(
        {
            "status": "ok" if status_code == 200 else "degraded",
            "checks": checks,
        },
        status=status_code,
    )


urlpatterns = [
    path(f"{settings.ADMIN_URL}/", admin.site.urls),
    path("api/", include("agenda.urls")),
    path("api/marketplace/", include("marketplace.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/admin/", include("config.admin_urls")),
    path(
        "api/admin/token/",
        AdminTokenObtainPairView.as_view(),
        name="admin_token_obtain",
    ),
    path("api/admin/me/", AdminMeView.as_view(), name="admin_me"),
    path("api/token/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/logout/", CookieTokenLogoutView.as_view(), name="token_logout"),
    path(
        "api/contractor/token/",
        ContractorTokenObtainPairView.as_view(),
        name="contractor_token_obtain",
    ),
    # Google OAuth
    path("api/auth/google/", GoogleAuthView.as_view(), name="google_auth"),
    path(
        "api/auth/google/register-musician/",
        GoogleRegisterMusicianView.as_view(),
        name="google_register_musician",
    ),
    path("api/readyz/", readyz),
    path("healthz/", healthz),
]

if settings.ENABLE_API_DOCS:
    urlpatterns += [
        # API Documentation (OpenAPI/Swagger)
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path(
            "api/docs/",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="swagger-ui",
        ),
        path(
            "api/redoc/",
            SpectacularRedocView.as_view(url_name="schema"),
            name="redoc",
        ),
    ]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
