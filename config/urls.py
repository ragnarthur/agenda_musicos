"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from config.auth_views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    CookieTokenLogoutView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('agenda.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    path('api/token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/logout/', CookieTokenLogoutView.as_view(), name='token_logout'),
]
