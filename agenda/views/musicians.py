# agenda/views/musicians.py
"""
ViewSet para gerenciamento de músicos.
"""

from django.db import connection
from django.db.models import Case, Count, IntegerField, Q, When
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..instrument_utils import INSTRUMENT_LABELS
from ..models import Instrument, LeaderAvailability, Musician
from ..pagination import StandardResultsSetPagination
from ..serializers import (
    MusicianSerializer,
    MusicianUpdateSerializer,
    PublicCalendarSerializer,
)
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

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def public_calendar(self, request, pk=None):
        """
        GET /musicians/{id}/public-calendar/
        Retorna agenda pública do músico (eventos + disponibilidades).

        Query Parameters:
        - days_ahead: número de dias à frente (padrão: 90, opções: 30, 60, 90)
        - include_private: incluir dados privados (apenas dono do perfil, padrão: false)

        Exemplo de uso:
        GET /musicians/5/public-calendar/?days_ahead=60

        Response:
        {
            "events": [...],
            "availabilities": [...]
        }
        """
        from rest_framework.permissions import IsAuthenticated
        from ..models import Event

        try:
            musician = self.get_object()
        except Exception:
            return Response(
                {"detail": "Músico não encontrado"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 1. Determinar se usuário é dono do perfil
        is_owner = False
        if request.user and request.user.is_authenticated and not request.user.is_staff:
            try:
                is_owner = request.user.musician_profile.id == musician.id
            except Exception:
                pass  # Usuário não tem perfil de músico

        # Parâmetros
        try:
            days_ahead = int(request.query_params.get("days_ahead", 365))
        except (TypeError, ValueError):
            days_ahead = 365
        # Limitar entre 30 e 365 dias
        days_ahead = max(30, min(365, days_ahead))

        include_private = request.query_params.get("include_private", "false") == "true"

        # Data limite
        end_date = timezone.now().date() + timezone.timedelta(days=days_ahead)

        # 2. Filtro base para todos os eventos futuros do músico
        event_filter = {
            "event_date__gte": timezone.now().date(),
            "event_date__lte": end_date,
        }

        # 3. Filtra eventos SEMPRE pelo músico do perfil visitado
        # A autenticação só altera o nível de detalhe (owner vs público)
        events_queryset = Event.objects.filter(
            Q(availabilities__musician=musician) | Q(created_by=musician.user),
            **event_filter,
        )

        # 4. Se não for dono, filtra apenas eventos confirmados/aprovados
        if not is_owner:
            events_queryset = events_queryset.filter(
                Q(status__in=["confirmed", "approved"])
                | Q(is_private=True, status__in=["proposed", "confirmed", "approved"])
            )

        events_queryset = events_queryset.distinct()

        # Ordenar e anotar disponibilidade
        events_queryset = events_queryset.order_by("event_date", "start_time")

        # Anotar contagem de disponibilidades para otimização (N+1 → N+2)
        events_queryset = events_queryset.annotate(
            avail_pending=Count(
                Case(
                    When(availabilities__response="pending", then=1),
                    default=0,
                ),
                output_field=IntegerField(),
            ),
            avail_available=Count(
                Case(
                    When(availabilities__response="available", then=1),
                    default=0,
                ),
                output_field=IntegerField(),
            ),
            avail_unavailable=Count(
                Case(
                    When(availabilities__response="unavailable", then=1),
                    default=0,
                ),
                output_field=IntegerField(),
            ),
            avail_maybe=Count(
                Case(
                    When(availabilities__response="maybe", then=1),
                    default=0,
                ),
                output_field=IntegerField(),
            ),
            avail_total=Count("availabilities"),
        )

        # Converter para lista
        events = list(events_queryset)

        # 2. Buscar disponibilidades públicas
        availabilities_queryset = LeaderAvailability.objects.filter(
            leader=musician,
            is_active=True,
            is_public=True,
            date__gte=timezone.now().date(),
            date__lte=end_date,
        ).order_by("date", "start_time")

        # Se não for dono, já está filtrando apenas públicas acima
        availabilities = list(availabilities_queryset)

        # 3. Serializar resposta
        response_data = {
            "events": events,
            "availabilities": availabilities,
            "is_owner": is_owner,
            "days_ahead": days_ahead,
        }

        # Usar serializer apropriado
        serializer = PublicCalendarSerializer(
            response_data, context={"request": request, "is_owner": is_owner}
        )

        return Response(serializer.data)
