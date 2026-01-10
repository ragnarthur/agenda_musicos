"""
URL configuration for config project.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from config.auth_views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    CookieTokenLogoutView,
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
    path("healthz/", healthz),
    path('api/token/logout/', CookieTokenLogoutView.as_view(), name='token_logout'),
]
