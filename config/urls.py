"""
URL configuration for config project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from config.auth_views import (
    AdminTokenObtainPairView,
    CompanyTokenObtainPairView,
    CookieTokenLogoutView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    GoogleAuthView,
    GoogleRegisterCompanyView,
    GoogleRegisterMusicianView,
)


def healthz(_request):
    return JsonResponse({"status": "ok"})


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
    path("api/token/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/logout/", CookieTokenLogoutView.as_view(), name="token_logout"),
    path(
        "api/company/token/",
        CompanyTokenObtainPairView.as_view(),
        name="company_token_obtain",
    ),
    # Google OAuth
    path("api/auth/google/", GoogleAuthView.as_view(), name="google_auth"),
    path(
        "api/auth/google/register-musician/",
        GoogleRegisterMusicianView.as_view(),
        name="google_register_musician",
    ),
    path(
        "api/auth/google/register-company/",
        GoogleRegisterCompanyView.as_view(),
        name="google_register_company",
    ),
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
    path("healthz/", healthz),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
