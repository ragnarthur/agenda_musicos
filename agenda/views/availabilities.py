# agenda/views/availabilities.py
"""
ViewSet para gerenciamento de disponibilidades de músicos.
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated

from ..models import Availability, Musician
from ..serializers import AvailabilitySerializer
from ..utils import get_user_organization


@extend_schema(
    parameters=[
        OpenApiParameter(name="id", type=int, location="path", description="ID da disponibilidade")
    ]
)
class AvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet para disponibilidades.
    Usuários só podem ver/editar suas próprias disponibilidades.
    """

    serializer_class = AvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtra para mostrar apenas disponibilidades do músico logado"""
        try:
            musician = self.request.user.musician_profile
            org = get_user_organization(self.request.user)
            queryset = Availability.objects.filter(musician=musician).select_related(
                "musician__user", "event"
            )

            if org:
                queryset = queryset.filter(event__organization=org)

            # Filtro por status da resposta
            response_filter = self.request.query_params.get("response")
            if response_filter:
                queryset = queryset.filter(response=response_filter)

            # Filtro por status do evento
            event_status = self.request.query_params.get("event_status")
            if event_status:
                queryset = queryset.filter(event__status=event_status)

            return queryset
        except Musician.DoesNotExist:
            return Availability.objects.none()

    def perform_create(self, serializer):
        """Força o musician a ser o usuário logado"""
        try:
            musician = self.request.user.musician_profile
            event = serializer.validated_data.get("event")
            if not event:
                raise ValidationError({"event": "Evento é obrigatório."})

            existing = Availability.objects.filter(musician=musician, event=event).first()
            if not existing:
                raise PermissionDenied("Você não foi convidado para este evento.")

            raise ValidationError(
                {
                    "detail": "Disponibilidade já existe. Use /events/{id}/set_availability/ ou PUT /availabilities/{id}/."
                }
            )
        except Musician.DoesNotExist:
            raise ValidationError({"detail": "Usuário não possui perfil de músico."})

    def perform_update(self, serializer):
        """Permite apenas atualizar a própria availability"""
        try:
            musician = self.request.user.musician_profile
            # Verifica se a availability pertence ao músico
            if serializer.instance.musician != musician:
                raise PermissionDenied("Você não pode editar disponibilidades de outros músicos.")
            serializer.save()
        except Musician.DoesNotExist:
            raise ValidationError({"detail": "Usuário não possui perfil de músico."})

    def perform_destroy(self, instance):
        """Permite apenas deletar a própria availability"""
        try:
            musician = self.request.user.musician_profile
            # Verifica se a availability pertence ao músico
            if instance.musician != musician:
                raise PermissionDenied("Você não pode deletar disponibilidades de outros músicos.")
            super().perform_destroy(instance)
        except Musician.DoesNotExist:
            raise ValidationError({"detail": "Usuário não possui perfil de músico."})
