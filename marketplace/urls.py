from rest_framework.routers import DefaultRouter

from .views import GigApplicationViewSet, GigViewSet

router = DefaultRouter()
router.register("gigs", GigViewSet, basename="gig")
router.register("applications", GigApplicationViewSet, basename="gig-application")

urlpatterns = router.urls
