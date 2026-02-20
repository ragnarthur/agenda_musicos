import logging
import threading
from decimal import Decimal, InvalidOperation

from django.core.cache import cache
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from agenda.models import Availability, Event, Musician
from agenda.validators import sanitize_string
from notifications.services.marketplace_notifications import (
    notify_gig_application_created,
    notify_gig_chat_message,
    notify_gig_closed,
    notify_gig_hire_result,
    notify_new_gig_in_city,
)

from .models import Gig, GigApplication, GigChatMessage
from .serializers import GigApplicationSerializer, GigChatMessageSerializer, GigSerializer

logger = logging.getLogger(__name__)


class GigViewSet(viewsets.ModelViewSet):
    """Endpoints para publicar e gerenciar oportunidades do marketplace."""

    serializer_class = GigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            Gig.objects.all()
            .select_related("created_by")
            .prefetch_related("applications__musician__user")
            .annotate(applications_total=Count("applications"))
        )

        status_filter = self.request.query_params.get("status")
        mine = self.request.query_params.get("mine")

        if status_filter:
            qs = qs.filter(status=status_filter)

        if mine in ("true", "1", "yes"):
            qs = qs.filter(created_by=self.request.user)

        return qs

    def list(self, request, *args, **kwargs):
        mine = request.query_params.get("mine")
        # Cache per-user (my_application field is user-specific)
        if mine not in ("true", "1", "yes"):
            params_key = "&".join(f"{k}={v}" for k, v in sorted(request.GET.items()))
            cache_key = f"gigs:list:v1:u{request.user.id}:{params_key}"
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)
            response = super().list(request, *args, **kwargs)
            cache.set(cache_key, response.data, timeout=30)
            return response
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        validated = serializer.validated_data

        if not user.is_staff:
            try:
                musician = user.musician_profile
            except Musician.DoesNotExist:
                raise PermissionDenied("Apenas músicos podem publicar vagas.")

        contact_name = validated.get("contact_name") or user.get_full_name() or user.username
        contact_email = validated.get("contact_email") or user.email

        gig = serializer.save(
            created_by=user,
            contact_name=contact_name,
            contact_email=contact_email,
        )
        gig_id = gig.id

        def _send_notifications():
            try:
                notify_new_gig_in_city(gig_id)
            except Exception:
                logger.exception("Falha ao notificar músicos sobre nova vaga %s", gig_id)

        transaction.on_commit(
            lambda: threading.Thread(target=_send_notifications, daemon=True).start()
        )

    def perform_update(self, serializer):
        gig = self.get_object()
        if gig.created_by != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("Apenas quem publicou a vaga pode editar.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.created_by != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("Apenas quem publicou a vaga pode excluir.")
        instance.delete()

    def _get_application_for_chat(self, gig, application_id):
        """Busca a candidatura, garantindo que pertence a esta vaga."""
        try:
            return gig.applications.select_related("musician__user").get(id=application_id)
        except GigApplication.DoesNotExist:
            raise PermissionDenied("Candidatura não encontrada nesta vaga.")

    def _assert_application_chat_access(self, gig, application, user):
        """Acesso ao chat: dono da vaga OU o candidato desta application (+ staff)."""
        if user.is_staff:
            return
        if gig.created_by_id == user.id:
            return
        if application.musician.user_id == user.id:
            return
        raise PermissionDenied("Acesso restrito aos envolvidos nesta candidatura.")

    def _application_chat_recipients(self, gig, application, sender_id: int):
        recipients = {}
        if gig.created_by and gig.created_by_id != sender_id:
            recipients[gig.created_by_id] = gig.created_by
        if application.musician.user_id != sender_id:
            recipients[application.musician.user_id] = application.musician.user
        return list(recipients.values())

    def _parse_hire_application_ids(self, request):
        """
        Suporta contratação individual (`application_id`) e em lote (`application_ids`).
        Retorna lista deduplicada de ids (int).
        """
        single_id = request.data.get("application_id")
        many_ids = request.data.get("application_ids")

        if many_ids is not None:
            if not isinstance(many_ids, list) or not many_ids:
                raise ValueError("application_ids deve ser uma lista com pelo menos 1 item.")
            raw_ids = many_ids
        elif single_id is not None:
            raw_ids = [single_id]
        else:
            raise ValueError("Informe application_id ou application_ids.")

        parsed = []
        for item in raw_ids:
            try:
                parsed.append(int(item))
            except (TypeError, ValueError):
                raise ValueError("IDs de candidatura inválidos.")

        # Preserva ordem e remove duplicados
        return list(dict.fromkeys(parsed))

    def _ensure_gig_schedule_for_hire(self, gig):
        """
        A contratação gera evento na agenda dos envolvidos.
        Logo, exige data e horário completos na vaga.
        """
        if not gig.event_date or not gig.start_time or not gig.end_time:
            raise ValueError(
                "Defina data, horário de início e horário de término da vaga antes de contratar."
            )

    def _validate_fee_against_budget_on_apply(self, gig, expected_fee):
        """Impede candidatura com cachê acima do orçamento da vaga."""
        if gig.budget is None or expected_fee is None:
            return
        if expected_fee > gig.budget:
            raise ValueError("O cachê informado não pode ser maior que o orçamento total da vaga.")

    def _validate_selected_fees_against_budget(self, gig, selected_applications):
        """
        Garante que a soma dos músicos selecionados não ultrapasse o orçamento da vaga.
        Quando há orçamento definido, cada candidatura selecionada precisa ter cachê.
        """
        if gig.budget is None:
            return

        missing_fee = [app for app in selected_applications if app.expected_fee is None]
        if missing_fee:
            raise ValueError(
                "Para contratar com orçamento definido, todos os músicos selecionados precisam informar cachê."
            )

        selected_total = sum((app.expected_fee or Decimal("0")) for app in selected_applications)
        if selected_total > gig.budget:
            raise ValueError("A soma dos cachês selecionados excede o orçamento total da vaga.")

    def _create_event_for_hired_band(self, gig, hired_applications):
        """
        Cria um evento confirmado na agenda ao concluir contratação via vaga.
        O criador da vaga e os músicos contratados entram como `available`.
        """
        if not gig.created_by:
            return

        creator_musician = getattr(gig.created_by, "musician_profile", None)
        if not creator_musician:
            return

        now = timezone.now()
        event = Event.objects.create(
            title=f"[Vaga] {gig.title}",
            description=(
                f"Evento gerado automaticamente a partir da vaga #{gig.id}.\n\n"
                f"{gig.description or ''}".strip()
            ),
            location=gig.location or "Local a combinar",
            venue_contact=(gig.contact_name or "").strip() or None,
            payment_amount=gig.budget,
            event_date=gig.event_date,
            start_time=gig.start_time,
            end_time=gig.end_time,
            is_solo=False,
            is_private=True,
            status="confirmed",
            organization=gig.organization,
            created_by=gig.created_by,
            approved_by=gig.created_by,
            approved_at=now,
        )

        participant_ids = {creator_musician.id}
        participant_ids.update(app.musician_id for app in hired_applications)

        participants = Musician.objects.filter(id__in=participant_ids, is_active=True)
        for musician in participants:
            note = "Contratação confirmada via Vagas."
            if musician.id == creator_musician.id:
                note = "Evento criado automaticamente a partir de vaga contratada."
            Availability.objects.update_or_create(
                musician=musician,
                event=event,
                defaults={
                    "response": "available",
                    "notes": note,
                    "responded_at": now,
                },
            )

    @action(
        detail=True,
        methods=["get", "post", "delete"],
        url_path=r"applications/(?P<application_id>\d+)/chat",
        url_name="application-chat",
    )
    def application_chat(self, request, pk=None, application_id=None):
        """
        Chat 1:1 por candidatura:
        - GET: lista mensagens da candidatura
        - POST: envia mensagem (disponível desde a candidatura)
        - DELETE: limpa histórico do chat da candidatura
        """
        gig = self.get_object()
        application = self._get_application_for_chat(gig, application_id)
        self._assert_application_chat_access(gig, application, request.user)

        if request.method.upper() == "GET":
            messages = GigChatMessage.objects.filter(application=application).select_related(
                "sender"
            )
            serializer = GigChatMessageSerializer(messages, many=True)
            return Response(serializer.data)

        if request.method.upper() == "DELETE":
            GigChatMessage.objects.filter(application=application).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # POST
        if gig.status in ("closed", "cancelled"):
            return Response(
                {"detail": "Chat indisponível para vagas encerradas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message_text = sanitize_string(
            request.data.get("message", ""), max_length=600, allow_empty=True
        )
        if not message_text:
            return Response(
                {"detail": "Mensagem inválida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chat_message = GigChatMessage.objects.create(
            gig=gig,
            application=application,
            sender=request.user,
            message=message_text,
        )

        recipients = self._application_chat_recipients(gig, application, request.user.id)
        if recipients:
            notify_gig_chat_message(gig, chat_message, recipients)

        serializer = GigChatMessageSerializer(chat_message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        """Músico freelancer se candidata a uma vaga."""
        gig = self.get_object()
        musician = getattr(request.user, "musician_profile", None)

        if not musician:
            return Response(
                {"detail": "Apenas músicos podem se candidatar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if gig.status in ["hired", "closed", "cancelled"]:
            return Response(
                {"detail": "Esta vaga não aceita mais candidaturas."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if gig.created_by_id == request.user.id:
            return Response(
                {"detail": "Você não pode se candidatar na própria vaga."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cover_letter = (
            sanitize_string(request.data.get("cover_letter", ""), max_length=2000, allow_empty=True)
            or ""
        )
        expected_fee = request.data.get("expected_fee")
        if expected_fee in [None, ""]:
            expected_fee = None
        else:
            try:
                expected_fee = Decimal(str(expected_fee))
            except (InvalidOperation, TypeError):
                return Response(
                    {"detail": "Valor esperado inválido."}, status=status.HTTP_400_BAD_REQUEST
                )
            if expected_fee < 0:
                return Response(
                    {"detail": "Valor esperado não pode ser negativo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                self._validate_fee_against_budget_on_apply(gig, expected_fee)
            except ValueError as exc:
                return Response(
                    {"detail": str(exc)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if GigApplication.objects.filter(gig=gig, musician=musician).exists():
            return Response(
                {"detail": "Você já se candidatou para esta vaga."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application = GigApplication.objects.create(
            gig=gig,
            musician=musician,
            cover_letter=cover_letter,
            expected_fee=expected_fee,
            status="pending",
        )

        if gig.status == "open":
            gig.status = "in_review"
            gig.save(update_fields=["status", "updated_at"])

        notify_gig_application_created(gig, application)

        serializer = GigApplicationSerializer(application)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def applications(self, request, pk=None):
        """Lista candidaturas - somente para quem criou a vaga."""
        gig = self.get_object()
        if gig.created_by != request.user and not request.user.is_staff:
            return Response(
                {"detail": "Acesso restrito ao criador da vaga."}, status=status.HTTP_403_FORBIDDEN
            )

        applications = gig.applications.select_related("musician__user").all()
        serializer = GigApplicationSerializer(applications, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def hire(self, request, pk=None):
        """Contrata um ou mais músicos para a vaga, rejeitando os demais pendentes."""
        gig = self.get_object()
        if gig.created_by != request.user and not request.user.is_staff:
            return Response(
                {"detail": "Apenas quem publicou a vaga pode contratar."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            selected_ids = self._parse_hire_application_ids(request)
            self._ensure_gig_schedule_for_hire(gig)
        except ValueError as exc:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={"detail": str(exc)},
            )

        with transaction.atomic():
            locked_gig = Gig.objects.select_for_update().get(id=gig.id)

            if locked_gig.status in ["closed", "cancelled"]:
                return Response(
                    {"detail": "Esta vaga já foi encerrada e não pode contratar."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if locked_gig.status == "hired":
                return Response(
                    {"detail": "Esta vaga já possui contratação concluída."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            selected_applications = list(
                locked_gig.applications.select_related("musician__user").filter(id__in=selected_ids)
            )
            if len(selected_applications) != len(selected_ids):
                return Response(
                    {"detail": "Uma ou mais candidaturas não foram encontradas para esta vaga."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            non_pending = [app for app in selected_applications if app.status != "pending"]
            if non_pending:
                return Response(
                    {"detail": "Apenas candidaturas pendentes podem ser contratadas."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                self._validate_selected_fees_against_budget(locked_gig, selected_applications)
            except ValueError as exc:
                return Response(
                    {"detail": str(exc)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            rejected_applications = list(
                locked_gig.applications.select_related("musician__user")
                .filter(status="pending")
                .exclude(id__in=selected_ids)
            )

            locked_gig.applications.filter(status="pending").exclude(id__in=selected_ids).update(
                status="rejected"
            )
            locked_gig.applications.filter(id__in=selected_ids).update(status="hired")

            locked_gig.status = "hired"
            locked_gig.save(update_fields=["status", "updated_at"])

            hired_applications = list(
                locked_gig.applications.select_related("musician__user").filter(id__in=selected_ids)
            )
            self._create_event_for_hired_band(locked_gig, hired_applications)

        notify_gig_hire_result(locked_gig, hired_applications, rejected_applications)

        serializer = GigSerializer(locked_gig, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        """Fecha a vaga sem contratação (ex: cancelamento)."""
        gig = self.get_object()
        if gig.created_by != request.user and not request.user.is_staff:
            return Response(
                {"detail": "Apenas quem publicou a vaga pode fechar."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get("status") or "closed"
        if new_status not in ["closed", "cancelled"]:
            return Response({"detail": "Status inválido."}, status=status.HTTP_400_BAD_REQUEST)

        affected_applications = list(
            gig.applications.select_related("musician__user").filter(status="pending")
        )

        gig.status = new_status
        gig.save(update_fields=["status", "updated_at"])
        if affected_applications:
            gig.applications.filter(id__in=[app.id for app in affected_applications]).update(
                status="rejected"
            )
        # Encerramento da vaga encerra também o chat da contratação.
        gig.chat_messages.all().delete()

        notify_gig_closed(gig, new_status, affected_applications)

        serializer = GigSerializer(gig, context={"request": request})
        return Response(serializer.data)


class GigApplicationViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Minhas candidaturas como músico freelancer."""

    serializer_class = GigApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        musician = getattr(self.request.user, "musician_profile", None)
        if not musician:
            return GigApplication.objects.none()

        return (
            GigApplication.objects.filter(musician=musician)
            .select_related("gig", "musician__user")
            .order_by("-created_at")
        )
