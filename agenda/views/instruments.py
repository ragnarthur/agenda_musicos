# agenda/views/instruments.py
"""
ViewSet para gerenciamento de instrumentos musicais.
"""

from django.db import models
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Instrument
from ..serializers import InstrumentCreateSerializer, InstrumentSerializer


class InstrumentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para listar instrumentos disponíveis.

    GET /api/instruments/ - Lista todos os instrumentos aprovados
    POST /api/instruments/create_custom/ - Cria novo instrumento customizado
    GET /api/instruments/search/?q=xxx - Busca instrumentos
    GET /api/instruments/popular/ - Retorna instrumentos mais populares
    """

    queryset = Instrument.objects.filter(is_approved=True)
    serializer_class = InstrumentSerializer
    permission_classes = []  # Público para listar

    def get_queryset(self):
        """Filtra e ordena instrumentos."""
        queryset = super().get_queryset()

        # Busca por query
        search = self.request.query_params.get("q", None)
        if search:
            search_normalized = Instrument.normalize_name(search)
            queryset = queryset.filter(
                Q(name__icontains=search_normalized) | Q(display_name__icontains=search)
            )

        # Ordena: pré-definidos primeiro, depois por uso
        queryset = queryset.annotate(
            type_order=models.Case(
                models.When(type="predefined", then=0),
                default=1,
                output_field=models.IntegerField(),
            )
        ).order_by("type_order", "-usage_count", "display_name")

        return queryset

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def create_custom(self, request):
        """
        Cria novo instrumento customizado.

        POST /api/instruments/create_custom/
        Body: { "display_name": "Cavaquinho" }
        """
        serializer = InstrumentCreateSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            instrument = serializer.save()
            return Response(InstrumentSerializer(instrument).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def popular(self, request):
        """
        Retorna instrumentos mais populares.

        GET /api/instruments/popular/
        """
        instruments = self.get_queryset()[:50]  # Top 50
        serializer = self.get_serializer(instruments, many=True)
        return Response(serializer.data)
