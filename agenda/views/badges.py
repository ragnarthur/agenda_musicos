# agenda/views/badges.py
"""
ViewSet para gerenciamento de badges/conquistas dos músicos.
"""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from ..models import Musician, MusicianBadge
from ..serializers import MusicianBadgeSerializer
from ..utils import award_badges_for_musician, get_badge_progress


@extend_schema(
    parameters=[
        OpenApiParameter(
            name="id", type=int, location="path", description="ID do badge"
        )
    ]
)
class BadgeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lista badges do músico logado com progresso para badges não conquistadas.
    """

    serializer_class = MusicianBadgeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            musician = self.request.user.musician_profile
        except Musician.DoesNotExist:
            return MusicianBadge.objects.none()

        award_badges_for_musician(musician)
        return MusicianBadge.objects.filter(musician=musician)

    def list(self, request, *args, **kwargs):
        """Retorna badges conquistadas e disponíveis com progresso."""
        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response({"earned": [], "available": []})

        data = get_badge_progress(musician)
        return Response(data)
