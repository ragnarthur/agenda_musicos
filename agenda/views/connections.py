# agenda/views/connections.py
"""
ViewSet para gerenciamento de conexões entre músicos.
"""

from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Connection, Musician
from ..pagination import StandardResultsSetPagination
from ..serializers import ConnectionSerializer


class ConnectionViewSet(viewsets.ModelViewSet):
    """
    Conexões entre músicos (seguir, ligar depois, indicar, já toquei com).
    """

    serializer_class = ConnectionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        try:
            musician = self.request.user.musician_profile
        except Musician.DoesNotExist:
            return Connection.objects.none()

        qs = Connection.objects.filter(follower=musician).select_related(
            "target__user", "follower__user"
        )

        ctype = self.request.query_params.get("type")
        if ctype:
            qs = qs.filter(connection_type=ctype)

        return qs

    def list(self, request, *args, **kwargs):
        if request.query_params.get("all") == "true":
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        try:
            musician = self.request.user.musician_profile
        except Musician.DoesNotExist:
            raise ValidationError({"detail": "Usuário não possui perfil de músico."})

        target = serializer.validated_data.get("target")
        if target == musician:
            raise ValidationError(
                {"detail": "Não é possível criar conexão consigo mesmo."}
            )

        serializer.save(follower=musician)
