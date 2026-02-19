# agenda/views/leader_availabilities.py
"""
ViewSet para gerenciamento de disponibilidades de líderes/músicos.
"""

import logging
from datetime import date, timedelta

from django.db import models
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..instrument_utils import get_instrument_label
from ..models import Event, LeaderAvailability, Musician
from ..serializers import EventListSerializer, LeaderAvailabilitySerializer
from ..utils import get_user_organization, split_availability_with_events


@extend_schema(
    parameters=[
        OpenApiParameter(name="id", type=int, location="path", description="ID da disponibilidade")
    ]
)
class LeaderAvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet para disponibilidades cadastradas por músicos.

    - Músicos podem CRUD suas próprias disponibilidades
    - Outros músicos podem visualizar apenas as públicas
    - Filtragem por data (upcoming, past, specific date)
    """

    serializer_class = LeaderAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Retorna disponibilidades ativas.
        Filtra por query params:
        - ?upcoming=true (datas futuras)
        - ?past=true (datas passadas)
        - ?date=YYYY-MM-DD (data específica)
        - ?leader=<id> (filtrar por músico específico)
        - ?search=termo (nome/username do músico)
        - ?public=true (apenas compartilhadas)
        - ?mine=true (apenas minhas)
        - ?instrument=<instrument> (filtrar por instrumento do músico)
        """
        queryset = LeaderAvailability.objects.filter(is_active=True).select_related("leader__user")

        mine_param = self.request.query_params.get("mine") == "true"
        public_param = self.request.query_params.get("public") == "true"

        # Default: mostrar apenas minhas agendas se nada for informado
        if not mine_param and not public_param:
            mine_param = True

        try:
            musician = self.request.user.musician_profile
        except Musician.DoesNotExist:
            if mine_param:
                return LeaderAvailability.objects.none()
            musician = None

        filters = models.Q()
        if mine_param and musician:
            filters |= models.Q(leader=musician)
        if public_param:
            filters |= models.Q(is_public=True)
        if not filters:
            return LeaderAvailability.objects.none()

        queryset = queryset.filter(filters)

        # Filtro por data futura
        if self.request.query_params.get("upcoming") == "true":
            queryset = queryset.filter(date__gte=timezone.now().date())

        # Filtro por data passada
        if self.request.query_params.get("past") == "true":
            queryset = queryset.filter(date__lt=timezone.now().date())

        # Filtro por data específica
        specific_date = self.request.query_params.get("date")
        if specific_date:
            queryset = queryset.filter(date=specific_date)

        # Filtro por músico específico
        leader_id = self.request.query_params.get("leader")
        if leader_id and public_param:
            queryset = queryset.filter(leader_id=leader_id)

        # Filtro por instrumento (checa campo primário OU lista de instrumentos)
        instrument = self.request.query_params.get("instrument")
        if instrument:
            queryset = queryset.filter(
                Q(leader__instrument=instrument) |
                Q(leader__instruments__icontains=instrument)
            )

        # Busca por nome/username/instagram do músico (funciona em todos os modos)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(leader__user__first_name__icontains=search)
                | Q(leader__user__last_name__icontains=search)
                | Q(leader__user__username__icontains=search)
                | Q(leader__instagram__icontains=search)
                | Q(notes__icontains=search)
            )

        return queryset

    def get_permissions(self):
        """
        Permissões: todos autenticados podem criar/editar suas próprias disponibilidades.
        """
        return [IsAuthenticated()]

    def _split_availability_with_events(self, availability, events):
        """
        Divide uma disponibilidade removendo intervalos ocupados por eventos.
        Delega para função utilitária em utils.py.
        """
        return split_availability_with_events(availability, events, LeaderAvailability)

    def perform_create(self, serializer):
        """
        Salva disponibilidade atribuindo o músico logado.
        """
        try:
            musician = self.request.user.musician_profile
            org = get_user_organization(self.request.user)
            serializer.save(leader=musician, organization=org)
            created = serializer.instance
            buffer = timedelta(minutes=40)
            conflicting_events = Event.objects.filter(
                status__in=["proposed", "approved", "confirmed"],
                start_datetime__lt=created.end_datetime + buffer,
                end_datetime__gt=created.start_datetime - buffer,
            )
            conflicting_events = conflicting_events.filter(
                Q(created_by=musician.user) | Q(availabilities__musician=musician)
            ).distinct()
            if conflicting_events.exists():
                # Ajusta disponibilidade recém-criada consumindo eventos já existentes
                self._split_availability_with_events(created, list(conflicting_events))
        except Musician.DoesNotExist:
            raise ValidationError({"detail": "Usuário não possui perfil de músico."})

    def create(self, request, *args, **kwargs):
        """
        Cria disponibilidade do músico com tratamento explícito de erros para evitar 500.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_create(serializer)
        except Exception as exc:
            logging.exception("Erro ao criar disponibilidade do músico")

            if isinstance(exc, ValidationError):
                raise
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        """
        Permite apenas que o músico atualize suas próprias disponibilidades.
        """
        try:
            musician = self.request.user.musician_profile

            # Verifica se a disponibilidade pertence ao músico
            if serializer.instance.leader != musician:
                raise PermissionDenied("Você não pode editar disponibilidades de outros músicos.")

            instance = serializer.save()
            buffer = timedelta(minutes=40)
            conflicting_events = Event.objects.filter(
                status__in=["proposed", "approved", "confirmed"],
                start_datetime__lt=instance.end_datetime + buffer,
                end_datetime__gt=instance.start_datetime - buffer,
            )
            conflicting_events = conflicting_events.filter(
                Q(created_by=musician.user) | Q(availabilities__musician=musician)
            ).distinct()
            if conflicting_events.exists():
                self._split_availability_with_events(instance, list(conflicting_events))
        except Musician.DoesNotExist:
            raise ValidationError({"detail": "Usuário não possui perfil de músico."})

    def perform_destroy(self, instance):
        """
        Permite apenas deletar a própria disponibilidade.
        """
        try:
            musician = self.request.user.musician_profile

            if instance.leader != musician:
                raise PermissionDenied("Você não pode excluir disponibilidades de outros músicos.")

            super().perform_destroy(instance)
        except Musician.DoesNotExist:
            raise ValidationError({"detail": "Usuário não possui perfil de músico."})

    @action(detail=True, methods=["get"])
    def conflicting_events(self, request, pk=None):
        """
        GET /leader-availabilities/{id}/conflicting_events/
        Retorna lista de eventos que conflitam com esta disponibilidade (incluindo buffer de 40 min).
        """
        availability = self.get_object()
        conflicting = availability.get_conflicting_events()

        serializer = EventListSerializer(conflicting, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def available_musicians(self, request):
        """
        GET /leader-availabilities/available_musicians/?date=YYYY-MM-DD
        Retorna todos os músicos ativos para convite, indicando quais têm
        disponibilidade publicada na data.

        Parâmetros opcionais:
        - instrument: filtra por instrumento
        - only_available: se 'true', retorna apenas músicos com disponibilidade
        """
        date_param = request.query_params.get("date")
        if not date_param:
            return Response(
                {"detail": 'Parâmetro "date" é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_date = date.fromisoformat(date_param)
        except ValueError:
            return Response(
                {"detail": "Formato de data inválido. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Busca todos os músicos ativos, exceto o próprio usuário
        musicians = (
            Musician.objects.filter(is_active=True)
            .select_related("user")
            .exclude(user=request.user)
        )

        if not request.user.is_staff:
            try:
                request.user.musician_profile
            except Musician.DoesNotExist:
                return Response([])

        # Filtro opcional por instrumento (checa campo primário OU lista de instrumentos)
        instrument = request.query_params.get("instrument")
        if instrument:
            musicians = musicians.filter(
                Q(instrument=instrument) |
                Q(instruments__icontains=instrument)
            )

        # Busca disponibilidades públicas na data (para associar aos músicos)
        availabilities_map = {}
        availabilities = LeaderAvailability.objects.filter(
            is_active=True, is_public=True, date=target_date
        ).select_related("leader")
        for avail in availabilities:
            availabilities_map.setdefault(avail.leader_id, []).append(avail)

        only_available = request.query_params.get("only_available", "").lower() == "true"

        result = []
        for musician in musicians:
            avail_list = availabilities_map.get(musician.id, [])
            primary_avail = min(avail_list, key=lambda x: x.start_time) if avail_list else None

            # Se only_available=true, pula músicos sem disponibilidade
            if only_available and not primary_avail:
                continue

            availability_slots = [
                {
                    "id": slot.id,
                    "start_time": slot.start_time.strftime("%H:%M"),
                    "end_time": slot.end_time.strftime("%H:%M"),
                    "notes": slot.notes,
                }
                for slot in sorted(avail_list, key=lambda x: x.start_time)
            ]

            musician_data = {
                "musician_id": musician.id,
                "musician_name": musician.user.get_full_name() or musician.user.username,
                "instrument": musician.instrument,
                "instrument_display": get_instrument_label(musician.instrument),
                "has_availability": primary_avail is not None,
                "availability_id": primary_avail.id if primary_avail else None,
                "start_time": primary_avail.start_time.strftime("%H:%M") if primary_avail else None,
                "end_time": primary_avail.end_time.strftime("%H:%M") if primary_avail else None,
                "notes": primary_avail.notes if primary_avail else None,
                "availability_count": len(avail_list),
                "availability_slots": availability_slots,
            }
            result.append(musician_data)

        # Ordena: músicos com disponibilidade primeiro, depois por nome
        result.sort(key=lambda x: (not x["has_availability"], x["musician_name"]))

        return Response(result)
