"""
URL configuration for config project.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from config.auth_views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    CookieTokenLogoutView,
    CompanyTokenObtainPairView,
    GoogleAuthView,
    GoogleRegisterMusicianView,
    GoogleRegisterCompanyView,
)

def healthz(_request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path('gf-secure-admin/', admin.site.urls),
    path('api/', include('agenda.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/logout/', CookieTokenLogoutView.as_view(), name='token_logout'),
    path('api/company/token/', CompanyTokenObtainPairView.as_view(), name='company_token_obtain'),
    # Google OAuth
    path('api/auth/google/', GoogleAuthView.as_view(), name='google_auth'),
    path('api/auth/google/register-musician/', GoogleRegisterMusicianView.as_view(), name='google_register_musician'),
    path('api/auth/google/register-company/', GoogleRegisterCompanyView.as_view(), name='google_register_company'),
    path("healthz/", healthz),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
