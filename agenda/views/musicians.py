# agenda/views/musicians.py
"""
ViewSet para gerenciamento de músicos.
"""

from django.db import connection
from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..instrument_utils import INSTRUMENT_LABELS
from ..models import Instrument, LeaderAvailability, Musician
from ..pagination import StandardResultsSetPagination
from ..serializers import MusicianSerializer, MusicianUpdateSerializer
from ..view_functions import normalize_search_text


class MusicianViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para músicos (apenas leitura).
    Lista todos os músicos ativos da plataforma.
    """

    serializer_class = MusicianSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsSetPagination

    def _scope_queryset(self, queryset):
        if self.request.user.is_staff:
            return queryset

        return queryset

    def get_queryset(self):
        queryset = Musician.objects.filter(is_active=True).select_related("user")
        queryset = self._scope_queryset(queryset)
        search = self.request.query_params.get("search")
        if search:
            search_normalized = normalize_search_text(search)
            queryset = queryset.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__first_name__icontains=search_normalized)
                | Q(user__last_name__icontains=search_normalized)
                | Q(user__username__icontains=search)
                | Q(instagram__icontains=search)
                | Q(bio__icontains=search)
                | Q(instrument__icontains=search)
                | Q(instrument__icontains=search_normalized)
                | Q(instruments__icontains=search)
                | Q(instruments__icontains=search_normalized)
            )
        instrument = self.request.query_params.get("instrument")
        if instrument and instrument != "all":
            # Validar instrument antes de usar
            # Normalizar e validar que o instrumento existe
            instrument_normalized = Instrument.normalize_name(instrument)
            valid_instruments = Instrument.objects.filter(
                name=instrument_normalized, is_approved=True
            ).values_list("name", flat=True)

            if not valid_instruments:
                # Se não for um instrumento aprovado, não filtra
                pass
            else:
                # Usar valor validado
                if connection.vendor == "sqlite":
                    queryset = queryset.filter(
                        Q(instrument=instrument_normalized)
                        | Q(instruments__icontains=f'"{instrument_normalized}"')
                    )
                else:
                    queryset = queryset.filter(
                        Q(instrument=instrument_normalized)
                        | Q(instruments__contains=[instrument_normalized])
                    )
        return queryset

    @action(
        detail=False, methods=["get", "patch"], permission_classes=[IsAuthenticated]
    )
    def me(self, request):
        """
        GET /musicians/me/
        Retorna ou atualiza o perfil do músico logado
        """
        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {"detail": "Usuário não possui perfil de músico."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method.lower() == "patch":
            serializer = MusicianUpdateSerializer(
                musician, data=request.data, partial=True, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            output = MusicianSerializer(musician, context={"request": request})
            return Response(output.data)

        serializer = self.get_serializer(musician)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def instruments(self, request):
        """
        GET /musicians/instruments/
        Retorna lista de instrumentos únicos dos músicos cadastrados
        com contagem de músicos por instrumento
        """
        instrument_labels = INSTRUMENT_LABELS

        # Busca instrumentos únicos com contagem
        instruments_data = (
            self._scope_queryset(Musician.objects.filter(is_active=True))
            .exclude(instrument__isnull=True)
            .exclude(instrument="")
            .values("instrument")
            .annotate(count=Count("id"))
            .order_by("instrument")
        )

        result = []
        for item in instruments_data:
            instrument = item["instrument"]
            result.append(
                {
                    "value": instrument,
                    "label": instrument_labels.get(instrument, instrument.capitalize()),
                    "count": item["count"],
                }
            )

        return Response(result)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def with_availability(self, request):
        """
        GET /musicians/with_availability/
        Retorna músicos que possuem disponibilidades públicas futuras
        """
        from django.utils import timezone

        # IDs de músicos com disponibilidades públicas futuras
        availability_qs = LeaderAvailability.objects.filter(
            is_active=True, is_public=True, date__gte=timezone.now().date()
        )
        if not request.user.is_staff:
            try:
                request.user.musician_profile
            except Musician.DoesNotExist:
                return Response([])

        musician_ids = availability_qs.values_list("leader_id", flat=True).distinct()

        queryset = self.get_queryset().filter(id__in=musician_ids)

        # Filtro por instrumento
        instrument = request.query_params.get("instrument")
        if instrument:
            queryset = queryset.filter(instrument=instrument)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
