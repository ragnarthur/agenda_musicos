from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import GigApplicationViewSet, GigViewSet, marketplace_chat_unread_count

router = DefaultRouter()
router.register("gigs", GigViewSet, basename="gig")
router.register("applications", GigApplicationViewSet, basename="gig-application")

urlpatterns = router.urls + [
    path("chat/unread-count/", marketplace_chat_unread_count, name="marketplace-chat-unread-count"),
]
