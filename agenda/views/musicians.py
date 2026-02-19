# agenda/views/musicians.py
"""
ViewSet para gerenciamento de músicos.
"""

from django.db.models import Case, Count, IntegerField, Q, When
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..instrument_utils import INSTRUMENT_LABELS
from ..models import LeaderAvailability, Musician
from ..pagination import StandardResultsSetPagination
from ..serializers import (
    MusicianSerializer,
    MusicianUpdateSerializer,
    PublicCalendarSerializer,
)
from ..view_functions import expand_instrument_search, normalize_search_text


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
            genre_search = search_normalized.replace(" ", "_")
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
                | Q(musical_genres__icontains=search)
                | Q(musical_genres__icontains=search_normalized)
                | Q(musical_genres__icontains=genre_search)
            )
        instrument = self.request.query_params.get("instrument")
        if instrument and instrument != "all":
            candidate_terms = set()
            for term in expand_instrument_search(instrument):
                raw_value = term.strip().lower()
                if raw_value:
                    candidate_terms.add(raw_value)
                    candidate_terms.add(raw_value.replace(" ", "_"))
                    candidate_terms.add(raw_value.replace("_", " "))
                normalized = normalize_search_text(term)
                if not normalized:
                    continue
                candidate_terms.add(normalized)
                candidate_terms.add(normalized.replace(" ", "_"))
                candidate_terms.add(normalized.replace("_", " "))

            if candidate_terms:
                instrument_q = Q()
                for term in candidate_terms:
                    instrument_q |= Q(instrument__iexact=term)
                    instrument_q |= Q(instruments__icontains=term)
                queryset = queryset.filter(instrument_q)
            else:
                queryset = queryset.none()
        return queryset

    @action(detail=False, methods=["get", "patch"], permission_classes=[IsAuthenticated])
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

        from ..models import Availability, Event

        try:
            musician = self.get_object()
        except Exception:
            return Response(
                {"detail": "Músico não encontrado"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 1. Determinar se usuário é dono do perfil
        is_owner = False
        if request.user and request.user.is_authenticated:
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

        try:
            days_back = int(request.query_params.get("days_back", 30))
        except (TypeError, ValueError):
            days_back = 30
        # Limitar entre 0 e 365 dias
        days_back = max(0, min(365, days_back))

        include_private = request.query_params.get("include_private", "false") == "true"

        # Datas limite
        today = timezone.now().date()
        start_date = today - timezone.timedelta(days=days_back)
        end_date = today + timezone.timedelta(days=days_ahead)

        # 2. Filtro base para todos os eventos futuros do músico
        event_filter = {
            "event_date__gte": start_date,
            "event_date__lte": end_date,
        }

        # 3. Filtra eventos SEMPRE pelo músico do perfil visitado
        # Usa subquery para evitar perda de eventos por JOIN em availabilities
        availability_event_ids = Availability.objects.filter(
            musician=musician,
            event__event_date__gte=start_date,
            event__event_date__lte=end_date,
        ).values("event_id")

        events_queryset = Event.objects.filter(**event_filter).filter(
            Q(created_by=musician.user) | Q(id__in=availability_event_ids)
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
            avail_total=Count("availabilities"),
        )

        # Converter para lista
        events = list(events_queryset)

        # 2. Buscar disponibilidades do músico
        availabilities_queryset = LeaderAvailability.objects.filter(
            leader=musician,
            is_active=True,
            date__gte=today,
            date__lte=end_date,
        ).order_by("date", "start_time")

        # Apenas o dono com include_private=true pode ver disponibilidades privadas
        if not (is_owner and include_private):
            availabilities_queryset = availabilities_queryset.filter(is_public=True)

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
