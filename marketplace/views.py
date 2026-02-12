from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Count
from django.db.models.functions import Coalesce
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from agenda.models import Musician
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


class GigViewSet(viewsets.ModelViewSet):
    """Endpoints para publicar e gerenciar oportunidades do marketplace."""

    serializer_class = GigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from datetime import datetime

        from django.db.models import DateTimeField, OuterRef, Prefetch, Q, Subquery, Value
        from django.utils import timezone

        from .models import GigApplicationChatReadState

        epoch = timezone.make_aware(datetime(1970, 1, 1))
        user = getattr(self.request, "user", None)

        # Annotate chat counts on applications to avoid N+1 in serializers.
        applications_qs = GigApplication.objects.select_related("musician__user")
        if user and user.is_authenticated:
            last_read_subq = (
                GigApplicationChatReadState.objects.filter(application=OuterRef("pk"), user=user)
                .values("last_read_at")[:1]
            )
            last_read_expr = Coalesce(
                Subquery(last_read_subq, output_field=DateTimeField()),
                Value(epoch),
            )
            applications_qs = applications_qs.annotate(
                _chat_count=Count("chat_messages", distinct=True),
                _unread_chat_count=Count(
                    "chat_messages",
                    filter=Q(chat_messages__created_at__gt=last_read_expr)
                    & ~Q(chat_messages__sender_id=user.id),
                    distinct=True,
                ),
            )
        else:
            from django.db.models import IntegerField

            applications_qs = applications_qs.annotate(
                _chat_count=Count("chat_messages", distinct=True),
                _unread_chat_count=Value(0, output_field=IntegerField()),
            )

        qs = (
            Gig.objects.all()
            .select_related("created_by")
            .prefetch_related(Prefetch("applications", queryset=applications_qs))
            .annotate(applications_total=Count("applications"))
        )

        status_filter = self.request.query_params.get("status")
        mine = self.request.query_params.get("mine")

        if status_filter:
            qs = qs.filter(status=status_filter)

        if mine in ("true", "1", "yes"):
            qs = qs.filter(created_by=self.request.user)

        return qs

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
        transaction.on_commit(lambda gig_id=gig.id: notify_new_gig_in_city(gig_id))

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

    def _mark_application_chat_read(self, application, user) -> None:
        from django.utils import timezone

        from .models import GigApplicationChatReadState

        if not user or not user.is_authenticated:
            return
        GigApplicationChatReadState.objects.update_or_create(
            application=application,
            user=user,
            defaults={"last_read_at": timezone.now()},
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
            messages = GigChatMessage.objects.filter(
                application=application
            ).select_related("sender")
            serializer = GigChatMessageSerializer(messages, many=True)
            self._mark_application_chat_read(application, request.user)
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

        # Sender just saw the thread (and their own message).
        self._mark_application_chat_read(application, request.user)

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
        """Contrata um músico para a vaga, rejeitando os demais."""
        gig = self.get_object()
        if gig.created_by != request.user and not request.user.is_staff:
            return Response(
                {"detail": "Apenas quem publicou a vaga pode contratar."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if gig.status in ["closed", "cancelled"]:
            return Response(
                {"detail": "Esta vaga já foi encerrada e não pode contratar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if gig.status == "hired":
            return Response(
                {"detail": "Esta vaga já possui músico contratado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application_id = request.data.get("application_id")
        try:
            application = gig.applications.select_related("musician__user").get(id=application_id)
        except GigApplication.DoesNotExist:
            return Response(
                {"detail": "Candidatura não encontrada para esta vaga."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if application.status != "pending":
            return Response(
                {"detail": "Apenas candidaturas pendentes podem ser contratadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejected_applications = list(
            gig.applications.select_related("musician__user")
            .filter(status="pending")
            .exclude(id=application.id)
        )

        with transaction.atomic():
            gig.applications.filter(status="pending").exclude(id=application_id).update(status="rejected")
            application.status = "hired"
            application.save(update_fields=["status"])
            gig.status = "hired"
            gig.save(update_fields=["status", "updated_at"])

        notify_gig_hire_result(gig, application, rejected_applications)

        serializer = GigSerializer(gig, context={"request": request})
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
        from datetime import datetime

        from django.db.models import DateTimeField, OuterRef, Q, Subquery, Value
        from django.utils import timezone

        from .models import GigApplicationChatReadState

        musician = getattr(self.request.user, "musician_profile", None)
        if not musician:
            return GigApplication.objects.none()

        epoch = timezone.make_aware(datetime(1970, 1, 1))
        last_read_subq = (
            GigApplicationChatReadState.objects.filter(
                application=OuterRef("pk"), user=self.request.user
            )
            .values("last_read_at")[:1]
        )
        last_read_expr = Coalesce(
            Subquery(last_read_subq, output_field=DateTimeField()),
            Value(epoch),
        )

        return (
            GigApplication.objects.filter(musician=musician)
            .select_related("gig", "musician__user")
            .annotate(
                _chat_count=Count("chat_messages", distinct=True),
                _unread_chat_count=Count(
                    "chat_messages",
                    filter=Q(chat_messages__created_at__gt=last_read_expr)
                    & ~Q(chat_messages__sender_id=self.request.user.id),
                    distinct=True,
                ),
            )
            .order_by("-created_at")
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def marketplace_chat_unread_count(request):
    """
    GET /api/marketplace/chat/unread-count/
    Soma de mensagens nao lidas no chat de Vagas (por candidatura) para o usuario logado.
    """
    from datetime import datetime

    from django.db.models import DateTimeField, OuterRef, Q, Subquery, Value
    from django.utils import timezone

    from .models import GigApplicationChatReadState

    epoch = timezone.make_aware(datetime(1970, 1, 1))
    last_read_subq = (
        GigApplicationChatReadState.objects.filter(
            application_id=OuterRef("application_id"), user=request.user
        )
        .values("last_read_at")[:1]
    )
    last_read_expr = Coalesce(
        Subquery(last_read_subq, output_field=DateTimeField()),
        Value(epoch),
    )

    count = (
        GigChatMessage.objects.filter(application__isnull=False)
        .filter(
            Q(application__gig__created_by_id=request.user.id)
            | Q(application__musician__user_id=request.user.id)
        )
        .exclude(sender_id=request.user.id)
        .filter(created_at__gt=last_read_expr)
        .count()
    )

    return Response({"count": count})
