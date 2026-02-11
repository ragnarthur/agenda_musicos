from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Count
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
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
)

from .models import Gig, GigApplication, GigChatMessage
from .serializers import GigApplicationSerializer, GigChatMessageSerializer, GigSerializer


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

        serializer.save(
            created_by=user,
            contact_name=contact_name,
            contact_email=contact_email,
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

    def _get_hired_application(self, gig):
        return (
            gig.applications.select_related("musician__user")
            .filter(status="hired")
            .first()
        )

    def _assert_chat_access(self, gig, user, hired_application=None):
        hired_application = hired_application or self._get_hired_application(gig)
        if user.is_staff or gig.created_by_id == user.id:
            return hired_application
        if hired_application and hired_application.musician.user_id == user.id:
            return hired_application
        raise PermissionDenied("Acesso restrito aos envolvidos na contratação.")

    def _chat_recipients(self, gig, hired_application, sender_id: int):
        recipients = []
        if gig.created_by and gig.created_by_id != sender_id:
            recipients.append(gig.created_by)
        if hired_application and hired_application.musician.user_id != sender_id:
            recipients.append(hired_application.musician.user)
        # Evita duplicidade por segurança
        deduped = {}
        for user in recipients:
            deduped[user.id] = user
        return list(deduped.values())

    @action(detail=True, methods=["get", "post", "delete"])
    def chat(self, request, pk=None):
        """
        Chat da contratação:
        - GET: lista mensagens
        - POST: envia mensagem (apenas vaga contratada)
        - DELETE: limpa histórico do chat
        """
        gig = self.get_object()
        hired_application = self._assert_chat_access(
            gig, request.user, hired_application=self._get_hired_application(gig)
        )

        if request.method.lower() == "get":
            messages = gig.chat_messages.select_related("sender").all()
            serializer = GigChatMessageSerializer(messages, many=True)
            return Response(serializer.data)

        if request.method.lower() == "delete":
            gig.chat_messages.all().delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if gig.status != "hired" or not hired_application:
            return Response(
                {"detail": "Chat disponível somente após contratação da vaga."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = sanitize_string(request.data.get("message", ""), max_length=600, allow_empty=True)
        if not message:
            return Response(
                {"detail": "Mensagem inválida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chat_message = GigChatMessage.objects.create(
            gig=gig,
            sender=request.user,
            message=message,
        )

        recipients = self._chat_recipients(gig, hired_application, request.user.id)
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
        musician = getattr(self.request.user, "musician_profile", None)
        if not musician:
            return GigApplication.objects.none()

        return (
            GigApplication.objects.filter(musician=musician)
            .select_related("gig", "musician__user")
            .order_by("-created_at")
        )
