# agenda/views/events.py
"""
ViewSet completo para gerenciamento de eventos musicais.

Este é o ViewSet mais complexo do sistema, responsável por:
- CRUD de eventos
- Gestão de disponibilidades de músicos convidados
- Confirmação/cancelamento de eventos
- Avaliações de músicos
- Detecção de conflitos de horário
"""

import logging
from datetime import date, datetime, time, timedelta

from django.db import models, transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    Availability,
    Event,
    EventInstrument,
    EventLog,
    Musician,
    MusicianRating,
)
from ..pagination import StandardResultsSetPagination
from ..permissions import IsOwnerOrReadOnly
from ..serializers import (
    AvailabilitySerializer,
    EventCreateSerializer,
    EventDetailSerializer,
    EventListSerializer,
    EventUpdateSerializer,
    MusicianRatingSerializer,
    RatingSubmitSerializer,
)
from ..throttles import (
    BurstRateThrottle,
    CreateEventRateThrottle,
    PreviewConflictsRateThrottle,
)
from ..utils import get_user_organization
from ..validators import sanitize_string

logger = logging.getLogger(__name__)


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet completo para eventos.

    Fluxo:
    1. Músico cria proposta (POST /events/)
    2. Sistema cria availabilities para todos os músicos convidados
    3. Músicos marcam disponibilidade e confirmam o evento ao aceitar
    """

    queryset = (
        Event.objects.prefetch_related(
            "availabilities__musician__user", "logs__performed_by"
        )
        .select_related("created_by", "approved_by")
        .all()
    )
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        """
        Permissões customizadas por action:
        - update/delete: apenas criador
        - outras: apenas autenticado
        """
        if self.action in ["update", "partial_update", "destroy", "cancel"]:
            return [IsAuthenticated(), IsOwnerOrReadOnly()]
        return [IsAuthenticated()]

    def get_throttles(self):
        """
        Throttles customizados por action:
        - create: limite de criação de eventos
        - preview_conflicts: limite de chamadas de preview
        - approve/reject: limite burst para ações sensíveis
        """
        if self.action == "create":
            return [CreateEventRateThrottle()]
        if self.action == "preview_conflicts":
            return [PreviewConflictsRateThrottle()]
        if self.action in ["approve", "reject", "cancel"]:
            return [BurstRateThrottle()]
        return super().get_throttles()

    def get_serializer_class(self):
        """Escolhe serializer baseado na action"""
        if self.action == "list":
            return EventListSerializer
        elif self.action == "create":
            return EventCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return EventUpdateSerializer
        return EventDetailSerializer

    def _apply_invitations(self, event, invited_musicians_ids):
        """Cria disponibilidades pendentes para músicos convidados (apenas novos)."""
        if not invited_musicians_ids:
            return

        invited_musicians_ids = list(dict.fromkeys(invited_musicians_ids))
        invited_musicians = Musician.objects.filter(
            id__in=invited_musicians_ids, is_active=True
        )

        if event.created_by_id:
            invited_musicians = invited_musicians.exclude(user=event.created_by)

        existing_ids = set(
            event.availabilities.filter(
                musician_id__in=invited_musicians.values_list("id", flat=True)
            ).values_list("musician_id", flat=True)
        )

        for musician in invited_musicians:
            if musician.id in existing_ids:
                continue
            Availability.objects.create(
                musician=musician,
                event=event,
                response="pending",
                notes="",
                responded_at=None,
            )

    def _replace_required_instruments(self, event, required_instruments):
        """Substitui instrumentos necessários quando enviados na atualização."""
        if required_instruments is None:
            return

        event.required_instruments.all().delete()
        self._save_required_instruments(event, required_instruments)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        invited_musicians_ids = serializer.validated_data.pop("invited_musicians", [])
        required_instruments = serializer.validated_data.pop(
            "required_instruments", None
        )

        updated_event = serializer.save()

        self._apply_invitations(updated_event, invited_musicians_ids)
        self._replace_required_instruments(updated_event, required_instruments)

        output = EventDetailSerializer(
            updated_event, context={"request": request}
        ).data
        return Response(output)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def get_queryset(self):
        """
        Filtra eventos baseado em query params:
        - ?status=proposed,approved
        - ?my_proposals=true (eventos que eu criei)
        - ?pending_approval=true (eventos aguardando resposta do músico convidado)
        - ?pending_responses=true (meus eventos com respostas de músicos pendentes)
        - ?search=termo (busca em título e local)
        - ?past=true (eventos passados)
        - ?upcoming=true (eventos futuros)
        """
        queryset = super().get_queryset()

        # Adiciona anotações para contagem de disponibilidades (otimização N+1)
        queryset = queryset.annotate(
            avail_pending=Count(
                "availabilities", filter=Q(availabilities__response="pending")
            ),
            avail_available=Count(
                "availabilities", filter=Q(availabilities__response="available")
            ),
            avail_unavailable=Count(
                "availabilities", filter=Q(availabilities__response="unavailable")
            ),
            avail_total=Count("availabilities"),
        )

        # Exibe eventos onde o usuário participa (criador ou availability).
        # Regra: para listagens (calendario/lista), nao retornamos eventos onde o musico marcou "unavailable",
        # para nao continuar bloqueando data na agenda do proprio musico.
        if not self.request.user.is_staff:
            try:
                musician = self.request.user.musician_profile
                if self.action == "list":
                    queryset = queryset.filter(
                        models.Q(created_by=self.request.user)
                        | models.Q(
                            availabilities__musician=musician,
                            availabilities__response__in=["pending", "available"],
                        )
                    ).distinct()
                else:
                    queryset = queryset.filter(
                        models.Q(created_by=self.request.user)
                        | models.Q(availabilities__musician=musician)
                    ).distinct()
            except Musician.DoesNotExist:
                queryset = queryset.filter(created_by=self.request.user)

        # Filtro por status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            statuses = status_filter.split(",")
            # Valida que status está em choices válidos
            valid_statuses = [choice[0] for choice in Event.STATUS_CHOICES]
            statuses = [s for s in statuses if s in valid_statuses]
            if statuses:
                queryset = queryset.filter(status__in=statuses)

        # Minhas propostas
        if self.request.query_params.get("my_proposals") == "true":
            queryset = queryset.filter(created_by=self.request.user)

        # Meus eventos com respostas pendentes de músicos
        # (usado no Dashboard para "Respostas Pendentes")
        if self.request.query_params.get("pending_responses") == "true":
            queryset = queryset.filter(
                created_by=self.request.user,
                status__in=["proposed", "confirmed", "approved"],
                avail_pending__gt=0,
            )

        # Pendentes de convite (eventos propostos onde o músico tem availability pendente)
        if self.request.query_params.get("pending_approval") == "true":
            try:
                musician = self.request.user.musician_profile
                queryset = queryset.filter(
                    status__in=["proposed", "confirmed", "approved"],
                    availabilities__musician=musician,
                    availabilities__response="pending",
                ).distinct()
            except Musician.DoesNotExist:
                return Event.objects.none()

        # Busca por título ou local
        search = self.request.query_params.get("search")
        if search:
            # Limita tamanho da query para prevenir DoS
            if len(search) > 100:
                raise ValidationError(
                    {"search": "Busca não pode ter mais de 100 caracteres."}
                )
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(location__icontains=search)
            )

        # Eventos passados
        if self.request.query_params.get("past") == "true":
            today = timezone.now().date()
            queryset = queryset.filter(event_date__lt=today)

            days_back_raw = self.request.query_params.get("days_back")
            if days_back_raw:
                try:
                    days_back = int(days_back_raw)
                except (TypeError, ValueError):
                    raise ValidationError(
                        {"days_back": "days_back deve ser um número inteiro positivo."}
                    )
                if days_back <= 0:
                    raise ValidationError(
                        {"days_back": "days_back deve ser maior que zero."}
                    )
                start_date = today - timedelta(days=days_back)
                queryset = queryset.filter(event_date__gte=start_date)

        # Eventos futuros (padrão)
        if self.request.query_params.get("upcoming") == "true":
            queryset = queryset.filter(event_date__gte=timezone.now().date())

        # Ordenação consistente para paginação
        return queryset.order_by('-event_date', '-id')

    @action(detail=False, methods=["post"])
    def preview_conflicts(self, request):
        """
        POST /events/preview_conflicts/
        Body: { "event_date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM" }
        Retorna eventos que conflitam com o período (incluindo buffer de 40 minutos).
        """
        data = request.data
        try:
            event_date = date.fromisoformat(data.get("event_date"))
            start_time_value = time.fromisoformat(data.get("start_time"))
            end_time_value = time.fromisoformat(data.get("end_time"))
        except Exception:
            return Response(
                {"detail": "Formato inválido de data/horário."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Constrói datetime com detecção de cruzar meia-noite
        start_dt = timezone.make_aware(datetime.combine(event_date, start_time_value))
        if end_time_value <= start_time_value:
            end_dt = timezone.make_aware(
                datetime.combine(event_date + timedelta(days=1), end_time_value)
            )
        else:
            end_dt = timezone.make_aware(datetime.combine(event_date, end_time_value))

        buffer = timedelta(minutes=40)
        # Adiciona anotações para otimizar N+1
        conflicts = (
            Event.objects.filter(
                status__in=["proposed", "approved", "confirmed"],
                start_datetime__lt=end_dt + buffer,
                end_datetime__gt=start_dt - buffer,
            )
            .select_related("created_by", "approved_by")
            .annotate(
                avail_pending=Count(
                    "availabilities", filter=Q(availabilities__response="pending")
                ),
                avail_available=Count(
                    "availabilities", filter=Q(availabilities__response="available")
                ),
                avail_unavailable=Count(
                    "availabilities", filter=Q(availabilities__response="unavailable")
                ),
                avail_total=Count("availabilities"),
            )
        )

        if not request.user.is_staff:
            try:
                musician = request.user.musician_profile
                conflicts = conflicts.filter(
                    Q(created_by=request.user) | Q(availabilities__musician=musician)
                ).distinct()
            except Musician.DoesNotExist:
                conflicts = conflicts.filter(created_by=request.user)

        serializer = EventListSerializer(
            conflicts, many=True, context={"request": request}
        )
        return Response(
            {
                "has_conflicts": conflicts.exists(),
                "count": conflicts.count(),
                "buffer_minutes": 40,
                "conflicts": serializer.data,
            }
        )

    def perform_create(self, serializer):
        """
        Cria evento e disponibilidades para músicos convidados.

        Novo fluxo:
        - is_solo=True: evento confirmado automaticamente, apenas criador participa
        - is_solo=False: evento fica 'proposed' até algum convidado aceitar
        - Sem convidados: evento é confirmado automaticamente
        """
        org = get_user_organization(self.request.user)

        is_solo = serializer.validated_data.get("is_solo", False)
        invited_musicians_ids = serializer.validated_data.pop("invited_musicians", [])
        required_instruments = serializer.validated_data.pop("required_instruments", [])

        if invited_musicians_ids:
            invited_musicians_ids = list(dict.fromkeys(invited_musicians_ids))

        # Transação atômica para garantir consistência
        with transaction.atomic():
            # Evento solo: confirmado automaticamente
            # Evento com convidados: aguarda confirmação dos músicos
            if is_solo:
                event = serializer.save(
                    created_by=self.request.user,
                    organization=org,
                    status="confirmed",
                    approved_by=self.request.user,
                    approved_at=timezone.now(),
                )
                self._log_event(
                    event, "created", "Show solo confirmado automaticamente."
                )
            else:
                event = serializer.save(
                    created_by=self.request.user,
                    organization=org,
                    status="proposed",
                )
                self._log_event(
                    event,
                    "created",
                    "Evento criado aguardando confirmação dos músicos convidados.",
                )

            if required_instruments:
                self._save_required_instruments(event, required_instruments)

            # Buscar músico do criador
            try:
                creator_musician = self.request.user.musician_profile
            except Musician.DoesNotExist:
                creator_musician = None

            now = timezone.now()

            # Criar availability do criador (sempre 'available')
            if creator_musician:
                Availability.objects.update_or_create(
                    musician=creator_musician,
                    event=event,
                    defaults={
                        "response": "available",
                        "notes": "Evento criado por mim",
                        "responded_at": now,
                    },
                )

            # Se não for solo, criar availability para músicos convidados
            if not is_solo and invited_musicians_ids:
                invited_musicians = Musician.objects.filter(
                    id__in=invited_musicians_ids, is_active=True
                ).exclude(
                    user=self.request.user
                )  # Exclui o criador (já adicionado acima)

                for musician in invited_musicians:
                    Availability.objects.update_or_create(
                        musician=musician,
                        event=event,
                        defaults={
                            "response": "pending",
                            "notes": "",
                            "responded_at": None,
                        },
                    )

            if not is_solo:
                self._check_and_confirm_event(event)

    def perform_destroy(self, instance):
        """
        Apenas o criador pode deletar o evento de forma definitiva.
        """
        request_user = (
            getattr(self, "request", None).user if hasattr(self, "request") else None
        )
        if request_user and instance.created_by and instance.created_by != request_user:
            raise PermissionDenied("Apenas o criador pode deletar este evento.")

        # Log de auditoria (usando logger em vez de AuditLog.objects.create)
        from django.utils import timezone

        logger.info(
            f"Event delete | User: {request_user.username} | "
            f"Deleted: {instance.title} (ID: {instance.id}) | "
            f"IP: {self.request.META.get('REMOTE_ADDR', '')}"
        )

        super().perform_destroy(instance)

    def _save_required_instruments(self, event, required_instruments):
        """Salva instrumentos necessários para o evento"""
        if not required_instruments:
            return

        objs = []
        for item in required_instruments:
            instrument = (item.get("instrument") or "").strip()
            quantity = item.get("quantity", 1)
            if not instrument:
                continue
            objs.append(
                EventInstrument(
                    event=event,
                    instrument=instrument,
                    quantity=quantity,
                )
            )

        if objs:
            EventInstrument.objects.bulk_create(objs)

    def _log_event(self, event, action, description):
        """Cria registro de histórico do evento"""
        EventLog.objects.create(
            event=event,
            performed_by=getattr(self.request, "user", None)
            if hasattr(self, "request")
            else None,
            action=action,
            description=description,
        )

    def _can_user_rate_event(self, event, user):
        """
        Verifica se o usuário pode avaliar os músicos do evento.
        Participantes podem avaliar após o término do evento.
        """
        is_creator = event.created_by and event.created_by == user
        is_invited = Availability.objects.filter(
            event=event, musician__user=user, response="available"
        ).exists()
        if not (is_creator or is_invited):
            return (
                False,
                "Apenas participantes do evento podem avaliar os músicos.",
                status.HTTP_403_FORBIDDEN,
            )

        event_end = event.end_datetime
        if not event_end and event.event_date and event.end_time:
            event_end = timezone.make_aware(
                datetime.combine(event.event_date, event.end_time)
            )

        if event_end and event_end >= timezone.now():
            return (
                False,
                "Avaliações são liberadas apenas após o término do evento.",
                status.HTTP_400_BAD_REQUEST,
            )

        already_rated = MusicianRating.objects.filter(
            event=event, rated_by=user
        ).exists()
        if already_rated:
            return (
                False,
                "Você já enviou avaliações para este evento.",
                status.HTTP_400_BAD_REQUEST,
            )

        return True, "", status.HTTP_200_OK

    def _check_and_confirm_event(self, event, confirmed_by=None):
        """
        Recalcula o status do evento baseado nas disponibilidades.

        Regras:
        - is_solo=True: confirmado automaticamente
        - Com convidados: confirma apenas quando TODOS os convidados aceitarem (available)
        - Sem convidados: confirmado automaticamente

        Se um evento ja confirmado perder alguma confirmacao (ex.: musico muda para unavailable),
        ele volta para proposed e limpamos approved_by/approved_at para nao exibir "Confirmado por ...".
        Usa select_for_update para evitar race conditions.
        """
        # Usa transação com lock para evitar race condition
        with transaction.atomic():
            # Re-busca o evento com lock exclusivo e tratamento de erro
            try:
                locked_event = Event.objects.select_for_update(nowait=False).get(
                    pk=event.pk
                )
            except Exception as e:
                logger.error(f"Erro ao obter lock do evento {event.pk}: {e}")
                raise ValidationError(
                    {"detail": "Conflito ao confirmar evento. Tente novamente."}
                )

            if locked_event.status in ["cancelled", "rejected"]:
                logger.warning(
                    f"Tentativa de confirmar evento {event.pk} com status {locked_event.status}"
                )
                return

            all_availabilities = locked_event.availabilities.select_for_update().all()

            # Convidados = todos exceto o criador
            invitee_availabilities = all_availabilities
            if locked_event.created_by_id:
                invitee_availabilities = invitee_availabilities.exclude(
                    musician__user=locked_event.created_by
                )

            prev_status = locked_event.status

            # Determina se o evento deve estar confirmado
            if locked_event.is_solo:
                should_confirm = True
            elif invitee_availabilities.exists():
                # Apenas confirma se TODOS os convidados aceitaram.
                should_confirm = not invitee_availabilities.exclude(
                    response="available"
                ).exists()
            else:
                # Sem convidados: confirma automaticamente
                should_confirm = True

            if should_confirm:
                if locked_event.status != "confirmed":
                    locked_event.status = "confirmed"

                if confirmed_by and not locked_event.approved_by:
                    locked_event.approved_by = confirmed_by
                    locked_event.approved_at = timezone.now()
                elif not locked_event.approved_by and locked_event.created_by:
                    locked_event.approved_by = locked_event.created_by
                    locked_event.approved_at = timezone.now()

                locked_event.save()

                # Loga apenas quando houve mudanca de status.
                if prev_status != "confirmed":
                    approver = locked_event.approved_by
                    approver_name = None
                    if approver:
                        approver_name = approver.get_full_name() or approver.username

                    description = (
                        f"Evento confirmado por {approver_name}."
                        if approver_name
                        else "Evento confirmado."
                    )
                    self._log_event(locked_event, "approved", description)
            else:
                # Se o evento estava confirmado, volta para "proposed"
                if locked_event.status in ["confirmed", "approved"]:
                    locked_event.status = "proposed"
                    locked_event.approved_by = None
                    locked_event.approved_at = None
                    locked_event.save()

                    if prev_status != "proposed":
                        self._log_event(
                            locked_event,
                            "availability",
                            "Evento voltou para Proposta Enviada (aguardando respostas dos músicos).",
                        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """
        POST /events/{id}/approve/
        Compat: confirma participação do músico convidado.
        """
        event = self.get_object()

        if event.status == "cancelled":
            return Response(
                {"detail": "Evento cancelado não pode ser confirmado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {"detail": "Usuário não possui perfil de músico."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Garante que o músico foi convidado para o evento
        if not event.availabilities.filter(musician=musician).exists():
            return Response(
                {"detail": "Apenas músicos convidados podem confirmar este evento."},
                status=status.HTTP_403_FORBIDDEN,
            )

        availability, created = Availability.objects.update_or_create(
            musician=musician,
            event=event,
            defaults={
                "response": "available",
                "notes": "Confirmado via convite",
                "responded_at": timezone.now(),
            },
        )

        if created or availability.response == "available":
            approver_name = request.user.get_full_name() or request.user.username
            self._log_event(
                event, "availability", f"Convite confirmado por {approver_name}."
            )

        self._check_and_confirm_event(event, confirmed_by=request.user)
        serializer = EventDetailSerializer(event, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """
        POST /events/{id}/reject/
        Body: { "reason": "motivo da rejeição" }
        Compat: recusa participação do músico convidado.
        """
        event = self.get_object()

        if event.status == "cancelled":
            return Response(
                {"detail": "Evento cancelado não pode ser recusado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {"detail": "Usuário não possui perfil de músico."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Garante que o músico foi convidado para o evento
        if not event.availabilities.filter(musician=musician).exists():
            return Response(
                {"detail": "Apenas músicos convidados podem recusar este evento."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Pega o motivo
        reason = request.data.get("reason", "")

        Availability.objects.update_or_create(
            musician=musician,
            event=event,
            defaults={
                "response": "unavailable",
                "notes": reason or "Convite recusado",
                "responded_at": timezone.now(),
            },
        )

        self._log_event(
            event,
            "availability",
            f"Convite recusado por {musician.user.get_full_name() or musician.user.username}. Motivo: {reason or 'Não informado.'}",
        )

        # Se o evento estava confirmado, pode precisar voltar para proposed.
        self._check_and_confirm_event(event)
        serializer = EventDetailSerializer(event, context={"request": request})
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, IsOwnerOrReadOnly],
    )
    def cancel(self, request, pk=None):
        """
        POST /events/{id}/cancel/
        Cancela um evento (apenas o criador pode cancelar).
        Muda o status para 'cancelled'.
        """
        event = self.get_object()

        # Apenas o criador pode cancelar
        if event.created_by != request.user:
            return Response(
                {"detail": "Apenas o criador pode cancelar este evento."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Verifica se o evento pode ser cancelado
        if event.status == "cancelled":
            return Response(
                {"detail": "Evento já está cancelado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cancela o evento
        event.status = "cancelled"
        event.save()
        self._log_event(event, "cancelled", "Evento cancelado pelo criador.")

        serializer = EventDetailSerializer(event, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def set_availability(self, request, pk=None):
        """
        POST /events/{id}/set_availability/
        Body: { "response": "available|unavailable", "notes": "..." }
        Marca disponibilidade do músico logado para o evento.

        O evento confirma apenas quando TODOS os convidados aceitarem (available).
        Se algum convidado marcar unavailable, o evento volta para proposed.
        """
        event = self.get_object()

        # Pega músico logado
        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {"detail": "Usuário não possui perfil de músico."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Apenas músicos convidados podem responder disponibilidade
        if not event.availabilities.filter(musician=musician).exists():
            return Response(
                {"detail": "Você não foi convidado para este evento."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Valida response
        response_value = request.data.get("response")
        valid_responses = ["available", "unavailable"]

        if response_value not in valid_responses:
            return Response(
                {
                    "detail": (
                        "Resposta inválida. Selecione 'Disponível' ou 'Indisponível'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Captura estado anterior para log
        previous = Availability.objects.filter(musician=musician, event=event).first()

        # Cria ou atualiza a disponibilidade
        sanitized_notes = sanitize_string(
            request.data.get("notes", ""), max_length=1000, allow_empty=True
        )
        availability, created = Availability.objects.update_or_create(
            musician=musician,
            event=event,
            defaults={
                "response": response_value,
                "notes": sanitized_notes,
                "responded_at": timezone.now(),
            },
        )

        # Registra log apenas se houve mudança
        prev_response = previous.response if previous else None
        prev_notes = previous.notes if previous else ""
        response_labels = {
            "available": "Disponível",
            "unavailable": "Indisponível",
        }
        response_label = response_labels.get(response_value, response_value)
        if (
            created
            or prev_response != response_value
            or prev_notes != (sanitized_notes or "")
        ):
            self._log_event(
                event,
                "availability",
                f"{musician.user.get_full_name() or musician.user.username} marcou disponibilidade: {response_label}",
            )

        # Recalcula confirmacao do evento (confirma ou "desconfirma")
        self._check_and_confirm_event(
            event, confirmed_by=request.user if response_value == "available" else None
        )

        serializer = EventDetailSerializer(event, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def can_rate(self, request, pk=None):
        """
        GET /events/{id}/can_rate/
        Retorna se o usuário atual pode avaliar os músicos do evento.
        """
        event = self.get_object()
        can_rate, reason, _ = self._can_user_rate_event(event, request.user)

        return Response({"can_rate": can_rate, "reason": reason})

    @action(detail=True, methods=["post"])
    def submit_ratings(self, request, pk=None):
        """
        POST /events/{id}/submit_ratings/
        Body: { "ratings": [{ "musician_id": 1, "rating": 5, "comment": "..." }] }
        Permite aos participantes avaliarem músicos após a data do evento.
        """
        event = self.get_object()
        can_rate, reason, status_code = self._can_user_rate_event(event, request.user)

        if not can_rate:
            return Response({"detail": reason, "can_rate": False}, status=status_code)

        serializer = RatingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ratings_data = serializer.validated_data["ratings"]

        allowed_musician_ids = set(
            event.availabilities.filter(response="available").values_list(
                "musician_id", flat=True
            )
        )
        try:
            creator_musician = event.created_by.musician_profile
        except Exception:
            creator_musician = None

        if creator_musician:
            allowed_musician_ids.add(creator_musician.id)

        try:
            rater_musician = request.user.musician_profile
        except Exception:
            rater_musician = None

        if rater_musician and rater_musician.id in allowed_musician_ids:
            allowed_musician_ids.discard(rater_musician.id)
        if not allowed_musician_ids:
            return Response(
                {"detail": "Não há músicos disponíveis para avaliação neste evento."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        seen_ids = set()
        normalized_ratings = []

        for item in ratings_data:
            musician_id_raw = item.get("musician_id")
            rating_raw = item.get("rating")

            try:
                musician_id = int(musician_id_raw)
            except (TypeError, ValueError):
                return Response(
                    {"detail": f"ID de músico inválido: {musician_id_raw}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                rating_value = int(rating_raw)
            except (TypeError, ValueError):
                return Response(
                    {"detail": f"Nota inválida para o músico {musician_id}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if rating_value < 1 or rating_value > 5:
                return Response(
                    {"detail": f"Nota do músico {musician_id} deve estar entre 1 e 5."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if rater_musician and musician_id == rater_musician.id:
                return Response(
                    {"detail": "Você não pode se autoavaliar."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if musician_id in seen_ids:
                return Response(
                    {
                        "detail": "Não é permitido avaliar o mesmo músico mais de uma vez."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if musician_id not in allowed_musician_ids:
                return Response(
                    {"detail": f"Músico {musician_id} não faz parte do evento."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            seen_ids.add(musician_id)
            normalized_ratings.append(
                {
                    "musician_id": musician_id,
                    "rating": rating_value,
                    "comment": (item.get("comment") or "").strip() or None,
                }
            )

        musicians_map = {m.id: m for m in Musician.objects.filter(id__in=seen_ids)}
        missing_musicians = seen_ids - set(musicians_map.keys())

        if missing_musicians:
            missing_list = ", ".join(map(str, sorted(missing_musicians)))
            return Response(
                {"detail": f"Músicos não encontrados: {missing_list}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_ratings = []
        with transaction.atomic():
            for item in normalized_ratings:
                musician = musicians_map[item["musician_id"]]
                rating_obj = MusicianRating.objects.create(
                    event=event,
                    musician=musician,
                    rated_by=request.user,
                    rating=item["rating"],
                    comment=item["comment"],
                )
                created_ratings.append(rating_obj)

        output_serializer = MusicianRatingSerializer(
            created_ratings, many=True, context={"request": request}
        )
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def my_events(self, request):
        """
        GET /events/my_events/
        Retorna eventos onde o usuário logado tem availability (pending/available).
        Eventos marcados como unavailable pelo proprio musico nao devem aparecer (para nao bloquear agenda).
        """
        try:
            musician = request.user.musician_profile
            events = Event.objects.filter(
                availabilities__musician=musician,
                availabilities__response__in=["pending", "available"],
            ).distinct()

            org = get_user_organization(request.user)
            if org:
                events = events.filter(organization=org)

            events = (
                events.select_related("created_by", "approved_by")
                .prefetch_related("availabilities__musician__user")
                .annotate(
                    avail_pending=Count(
                        "availabilities", filter=Q(availabilities__response="pending")
                    ),
                    avail_available=Count(
                        "availabilities", filter=Q(availabilities__response="available")
                    ),
                    avail_unavailable=Count(
                        "availabilities",
                        filter=Q(availabilities__response="unavailable"),
                    ),
                    avail_total=Count("availabilities"),
                )
            )

            serializer = self.get_serializer(events, many=True)
            return Response(serializer.data)
        except Musician.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def pending_my_response(self, request):
        """
        GET /events/pending_my_response/
        Retorna eventos onde o músico ainda não respondeu disponibilidade
        """
        try:
            musician = request.user.musician_profile
            events = Event.objects.filter(
                availabilities__musician=musician, availabilities__response="pending"
            ).distinct()

            org = get_user_organization(request.user)
            if org:
                events = events.filter(organization=org)

            events = (
                events.select_related("created_by", "approved_by")
                .prefetch_related("availabilities__musician__user")
                .annotate(
                    avail_pending=Count(
                        "availabilities", filter=Q(availabilities__response="pending")
                    ),
                    avail_available=Count(
                        "availabilities", filter=Q(availabilities__response="available")
                    ),
                    avail_unavailable=Count(
                        "availabilities",
                        filter=Q(availabilities__response="unavailable"),
                    ),
                    avail_total=Count("availabilities"),
                )
            )

            serializer = EventListSerializer(
                events, many=True, context={"request": request}
            )
            return Response(serializer.data)
        except Musician.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)
