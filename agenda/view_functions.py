# agenda/view_functions.py
"""
Views funcionais (api_view) extraidas do views_legacy.py monolitico.
Mantem compatibilidade com as rotas em agenda/urls.py.
"""

import logging
import secrets
from datetime import date, timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .image_processing import (
    MAX_AVATAR_BYTES,
    MAX_AVATAR_SIZE,
    MAX_COVER_BYTES,
    MAX_COVER_SIZE,
    _process_profile_image,
)
from .models import (
    Booking,
    BookingEvent,
    Connection,
    ContactView,
    ContractorProfile,
    Event,
    Membership,
    Musician,
    MusicianBadge,
    MusicianRating,
    MusicianRequest,
    Organization,
    QuoteProposal,
    QuoteRequest,
)
from .serializers import (
    BookingEventSerializer,
    BookingSerializer,
    ContractorProfileSerializer,
    MusicianPublicSerializer,
    MusicianRatingSerializer,
    MusicianRequestAdminSerializer,
    MusicianRequestCreateSerializer,
    OrganizationPublicSerializer,
    OrganizationSerializer,
    QuoteProposalCreateSerializer,
    QuoteProposalSerializer,
    QuoteRequestCreateSerializer,
    QuoteRequestSerializer,
)
from .throttles import PublicRateThrottle

logger = logging.getLogger(__name__)


# =============================================================================
# Image uploads
# =============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """
    POST /api/musicians/upload-avatar/
    Upload de foto de perfil do músico
    """
    try:
        musician = request.user.musician_profile
        if "avatar" not in request.FILES:
            logger.warning(
                "Upload de avatar sem arquivo | user_id=%s",
                getattr(request.user, "id", None),
            )
            return Response(
                {"detail": "Nenhuma imagem enviada"}, status=status.HTTP_400_BAD_REQUEST
            )

        avatar_file = request.FILES["avatar"]
        processed_file = _process_profile_image(
            avatar_file,
            max_bytes=MAX_AVATAR_BYTES,
            max_size=MAX_AVATAR_SIZE,
            crop_square=True,
            quality=88,
            prefix="avatar",
        )

        if musician.avatar:
            musician.avatar.delete(save=False)

        musician.avatar = processed_file
        musician.save()

        return Response(
            {"avatar": request.build_absolute_uri(musician.avatar.url)},
            status=status.HTTP_200_OK,
        )

    except Musician.DoesNotExist:
        logger.warning(
            "Upload de avatar sem perfil de músico | user_id=%s",
            getattr(request.user, "id", None),
        )
        return Response(
            {"detail": "Perfil não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except ValueError as exc:
        logger.warning(
            "Upload de avatar inválido | user_id=%s",
            getattr(request.user, "id", None),
        )
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception(
            "Erro inesperado no upload de avatar | user_id=%s",
            getattr(request.user, "id", None),
        )
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_cover(request):
    """
    POST /api/musicians/upload-cover/
    Upload de imagem de capa do perfil
    """
    try:
        musician = request.user.musician_profile
        if "cover_image" not in request.FILES:
            logger.warning(
                "Upload de capa sem arquivo | user_id=%s",
                getattr(request.user, "id", None),
            )
            return Response(
                {"detail": "Nenhuma imagem enviada"}, status=status.HTTP_400_BAD_REQUEST
            )

        cover_file = request.FILES["cover_image"]
        processed_file = _process_profile_image(
            cover_file,
            max_bytes=MAX_COVER_BYTES,
            max_size=MAX_COVER_SIZE,
            crop_square=False,
            quality=85,
            prefix="cover",
        )

        if musician.cover_image:
            musician.cover_image.delete(save=False)

        musician.cover_image = processed_file
        musician.save()

        return Response(
            {"cover_image": request.build_absolute_uri(musician.cover_image.url)},
            status=status.HTTP_200_OK,
        )

    except Musician.DoesNotExist:
        logger.warning(
            "Upload de capa sem perfil de músico | user_id=%s",
            getattr(request.user, "id", None),
        )
        return Response(
            {"detail": "Perfil não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except ValueError as exc:
        logger.warning(
            "Upload de capa inválido | user_id=%s",
            getattr(request.user, "id", None),
        )
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception(
            "Erro inesperado no upload de capa | user_id=%s",
            getattr(request.user, "id", None),
        )
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =============================================================================
# Musician connections/reviews/badges
# =============================================================================


@api_view(["GET"])
def get_musician_connections(request, musician_id):
    """
    GET /api/musicians/<id>/connections/?type=follow&limit=6
    """
    try:
        musician = Musician.objects.get(id=musician_id, is_active=True)

        ctype = (request.query_params.get("type") or "").strip()
        limit_raw = request.query_params.get("limit") or "6"

        try:
            limit = int(limit_raw)
        except ValueError:
            return Response(
                {"detail": 'Parâmetro "limit" inválido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        limit = max(1, min(limit, 24))

        qs = (
            Connection.objects.filter(follower=musician)
            .select_related("target__user")
            .order_by("-created_at")
        )

        if ctype:
            qs = qs.filter(connection_type=ctype)

        total_unique = qs.values("target_id").distinct().count()

        seen_target_ids = set()
        unique_targets = []

        for conn in qs:
            if conn.target_id in seen_target_ids:
                continue
            seen_target_ids.add(conn.target_id)
            unique_targets.append(conn)
            if len(unique_targets) >= limit:
                break

        connected_musicians = []
        for conn in unique_targets:
            target = conn.target
            connected_musicians.append(
                {
                    "id": target.id,
                    "full_name": target.user.get_full_name() or target.user.username,
                    "instrument": target.instrument,
                    "avatar": (
                        request.build_absolute_uri(target.avatar.url)
                        if target.avatar
                        else None
                    ),
                }
            )

        return Response(
            {
                "total": total_unique,
                "connections": connected_musicians,
                "limit": limit,
                "type": ctype or None,
            },
            status=status.HTTP_200_OK,
        )

    except Musician.DoesNotExist:
        return Response(
            {"detail": "Músico não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception:
        logger.exception("Erro ao buscar conexões")
        return Response(
            {"detail": "Erro interno ao buscar conexões."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def get_musician_reviews(request, musician_id):
    """
    GET /api/musicians/<id>/reviews/
    """
    try:
        musician = Musician.objects.get(id=musician_id, is_active=True)
        reviews = (
            MusicianRating.objects.filter(musician=musician)
            .select_related("rated_by", "event")
            .order_by("-created_at")[:10]
        )
        serializer = MusicianRatingSerializer(
            reviews, many=True, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Musician.DoesNotExist:
        return Response(
            {"detail": "Músico não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as exc:
        logger.exception("Erro ao buscar avaliações")
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_musician_badges(request, musician_id):
    """
    GET /api/musicians/<id>/badges/
    """
    try:
        musician = Musician.objects.get(id=musician_id, is_active=True)
        badges = MusicianBadge.objects.filter(musician=musician).order_by("-awarded_at")
        badge_data = []
        for badge in badges:
            badge_data.append(
                {
                    "id": badge.id,
                    "badge_type": badge.badge_type,
                    "name": badge.get_badge_type_display(),
                    "description": badge.description,
                    "icon": badge.icon,
                    "awarded_at": badge.awarded_at.isoformat()
                    if badge.awarded_at
                    else None,
                }
            )
        return Response(badge_data, status=status.HTTP_200_OK)

    except Musician.DoesNotExist:
        return Response(
            {"detail": "Músico não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as exc:
        logger.exception("Erro ao buscar badges")
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_musician_stats(request, musician_id):
    """
    GET /api/musicians/<id>/stats/
    """
    try:
        musician = Musician.objects.get(id=musician_id, is_active=True)

        total_events = (
            Event.objects.filter(
                availabilities__musician=musician,
                availabilities__response="available",
                status__in=["confirmed", "approved"],
            )
            .distinct()
            .count()
        )

        events_as_leader = Event.objects.filter(
            created_by=musician.user, status__in=["confirmed", "approved"]
        ).count()

        events_as_member = (
            Event.objects.filter(
                availabilities__musician=musician,
                availabilities__response="available",
                status__in=["confirmed", "approved"],
            )
            .exclude(created_by=musician.user)
            .distinct()
            .count()
        )

        return Response(
            {
                "total_events": total_events,
                "events_as_leader": events_as_leader,
                "events_as_member": events_as_member,
            },
            status=status.HTTP_200_OK,
        )

    except Musician.DoesNotExist:
        return Response(
            {"detail": "Músico não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as exc:
        logger.exception("Erro ao buscar estatísticas")
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_musician_connection_status(request, musician_id):
    """
    GET /api/musicians/<id>/connection-status/
    """
    try:
        target_musician = Musician.objects.get(id=musician_id, is_active=True)
        try:
            current_musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {
                    "is_connected": False,
                    "connection_id": None,
                    "connection_type": None,
                },
                status=status.HTTP_200_OK,
            )

        connection = Connection.objects.filter(
            follower=current_musician, target=target_musician
        ).first()

        if connection:
            return Response(
                {
                    "is_connected": True,
                    "connection_id": connection.id,
                    "connection_type": connection.connection_type,
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "is_connected": False,
                "connection_id": None,
                "connection_type": None,
            },
            status=status.HTTP_200_OK,
        )

    except Musician.DoesNotExist:
        return Response(
            {"detail": "Músico não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as exc:
        logger.exception("Erro ao verificar conexão")
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =============================================================================
# Musician request (solicitação de acesso)
# =============================================================================


@api_view(["POST"])
@permission_classes([AllowAny])
def create_musician_request(request):
    serializer = MusicianRequestCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    musician_request = serializer.save()

    return Response(
        {
            "message": "Solicitação enviada com sucesso! Você receberá um email quando sua solicitação for analisada.",
            "id": musician_request.id,
        },
        status=status.HTTP_201_CREATED,
    )


def _send_invite_email(musician_request: MusicianRequest) -> tuple[str, str]:
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    invite_url = f"{frontend_url}/cadastro/invite?token={musician_request.invite_token}"
    expires_at = musician_request.invite_expires_at.strftime("%d/%m/%Y às %H:%M")

    context = {
        "full_name": musician_request.full_name,
        "email": musician_request.email,
        "invite_url": invite_url,
        "expires_at": expires_at,
    }
    html_message = render_to_string("emails/invite_approved.html", context)

    text_message = f"""
Olá {musician_request.full_name}!

Sua solicitação de acesso ao GigFlow foi aprovada! 🎉

Para completar seu cadastro, clique no link abaixo:
{invite_url}

Importante: Este convite expira em 7 dias ({expires_at}).

Bem-vindo ao GigFlow!

---
Este é um email automático. Por favor, não responda.
    """.strip()

    send_mail(
        subject="🎉 Sua solicitação foi aprovada - GigFlow",
        message=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[musician_request.email],
        html_message=html_message,
        fail_silently=False,
    )
    return invite_url, expires_at


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_musician_requests(request):
    if not request.user.is_staff:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    status_filter = request.query_params.get("status", "pending")
    queryset = MusicianRequest.objects.all().order_by("-created_at")

    if status_filter and status_filter != "all":
        queryset = queryset.filter(status=status_filter)

    city = request.query_params.get("city")
    if city:
        queryset = queryset.filter(city__icontains=city)

    state = request.query_params.get("state")
    if state:
        queryset = queryset.filter(state__iexact=state)

    serializer = MusicianRequestAdminSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_musician_request(request, request_id):
    if not request.user.is_staff:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    musician_request = get_object_or_404(MusicianRequest, id=request_id)
    serializer = MusicianRequestAdminSerializer(musician_request)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_musician_request(request, request_id):
    if not request.user.is_staff:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    musician_request = get_object_or_404(MusicianRequest, id=request_id)

    if musician_request.status != "pending":
        return Response(
            {
                "detail": f"Solicitação já foi {musician_request.get_status_display().lower()}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    notes = request.data.get("admin_notes", "")
    invite_token = musician_request.approve(request.user, notes)

    try:
        _send_invite_email(musician_request)

        logger.info("Email de aprovação enviado para %s", musician_request.email)

    except Exception as exc:
        logger.error("Erro ao enviar email de aprovação: %s", exc)

    return Response(
        {
            "message": "Solicitação aprovada com sucesso! Email enviado.",
            "invite_token": invite_token,
            "invite_expires_at": musician_request.invite_expires_at.isoformat(),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resend_musician_request_invite(request, request_id):
    if not request.user.is_staff:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    musician_request = get_object_or_404(MusicianRequest, id=request_id)

    if musician_request.status != "approved":
        return Response(
            {"detail": "A solicitação precisa estar aprovada para reenviar o convite."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if musician_request.invite_used:
        return Response(
            {"detail": "Este convite já foi utilizado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if (
        not musician_request.invite_token
        or not musician_request.invite_expires_at
        or musician_request.invite_expires_at < timezone.now()
    ):
        musician_request.invite_token = secrets.token_urlsafe(32)
        musician_request.invite_expires_at = timezone.now() + timedelta(days=7)
        musician_request.invite_used = False
        musician_request.save()

    try:
        _send_invite_email(musician_request)
        logger.info("Email de aprovação reenviado para %s", musician_request.email)
    except Exception as exc:
        logger.error("Erro ao reenviar email de aprovação: %s", exc)
        return Response(
            {"detail": "Erro ao enviar email de aprovação."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Email reenviado com sucesso!",
            "invite_token": musician_request.invite_token,
            "invite_expires_at": musician_request.invite_expires_at.isoformat()
            if musician_request.invite_expires_at
            else None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reject_musician_request(request, request_id):
    if not request.user.is_staff:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    musician_request = get_object_or_404(MusicianRequest, id=request_id)

    if musician_request.status != "pending":
        return Response(
            {
                "detail": f"Solicitação já foi {musician_request.get_status_display().lower()}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    notes = request.data.get("admin_notes", "")
    musician_request.reject(request.user, notes)

    return Response({"message": "Solicitação rejeitada"}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def validate_invite_token(request):
    token = request.query_params.get("token")
    if not token:
        return Response(
            {"detail": "Token não fornecido"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        musician_request = MusicianRequest.objects.get(invite_token=token)
    except MusicianRequest.DoesNotExist:
        return Response({"detail": "Token inválido"}, status=status.HTTP_404_NOT_FOUND)

    if not musician_request.is_invite_valid():
        if musician_request.invite_used:
            return Response(
                {"detail": "Este convite já foi utilizado"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"detail": "Convite expirado"}, status=status.HTTP_400_BAD_REQUEST
        )

    return Response(
        {
            "valid": True,
            "email": musician_request.email,
            "full_name": musician_request.full_name,
            "phone": musician_request.phone,
            "instrument": musician_request.instrument,
            "instruments": musician_request.instruments,
            "bio": musician_request.bio,
            "city": musician_request.city,
            "state": musician_request.state,
            "instagram": musician_request.instagram,
        }
    )


# =============================================================================
# Quote requests (Contratantes -> Músicos)
# =============================================================================


def _log_booking_event(request_obj, actor_type, actor_user, action, metadata=None):
    BookingEvent.objects.create(
        request=request_obj,
        actor_type=actor_type,
        actor_user=actor_user,
        action=action,
        metadata=metadata or {},
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_quote_request(request):
    if not hasattr(request.user, "contractor_profile"):
        return Response(
            {"detail": "Apenas contratantes podem enviar pedidos."},
            status=status.HTTP_403_FORBIDDEN,
        )

    contractor = request.user.contractor_profile
    serializer = QuoteRequestCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    musician = serializer.validated_data.get("musician")
    if musician and not musician.is_active:
        return Response(
            {"detail": "Este músico não está disponível para novos pedidos."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    quote_request = serializer.save(contractor=contractor)
    _log_booking_event(quote_request, "contractor", request.user, "pedido_criado")

    return Response(
        QuoteRequestSerializer(quote_request, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_contractor_quote_requests(request):
    if not hasattr(request.user, "contractor_profile"):
        return Response(
            {"detail": "Apenas contratantes podem acessar esta rota."},
            status=status.HTTP_403_FORBIDDEN,
        )

    contractor = request.user.contractor_profile
    status_filter = request.query_params.get("status")
    queryset = QuoteRequest.objects.filter(contractor=contractor).order_by(
        "-created_at"
    )
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    serializer = QuoteRequestSerializer(
        queryset, many=True, context={"request": request}
    )
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_musician_quote_requests(request):
    try:
        musician = request.user.musician_profile
    except Musician.DoesNotExist:
        return Response(
            {"detail": "Perfil de músico não encontrado"},
            status=status.HTTP_404_NOT_FOUND,
        )

    status_filter = request.query_params.get("status")
    queryset = QuoteRequest.objects.filter(musician=musician).order_by("-created_at")
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    serializer = QuoteRequestSerializer(
        queryset, many=True, context={"request": request}
    )
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_quote_request(request, request_id):
    quote_request = get_object_or_404(QuoteRequest, id=request_id)

    is_contractor = (
        hasattr(request.user, "contractor_profile")
        and quote_request.contractor == request.user.contractor_profile
    )
    is_musician = (
        hasattr(request.user, "musician_profile")
        and quote_request.musician == request.user.musician_profile
    )

    if not is_contractor and not is_musician:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    serializer = QuoteRequestSerializer(quote_request, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def musician_send_proposal(request, request_id):
    quote_request = get_object_or_404(QuoteRequest, id=request_id)

    try:
        musician = request.user.musician_profile
    except Musician.DoesNotExist:
        return Response(
            {"detail": "Perfil de músico não encontrado"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if quote_request.musician != musician:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    if quote_request.status not in ["pending", "responded"]:
        return Response(
            {"detail": "Este pedido não aceita novas propostas."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = QuoteProposalCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    proposal = QuoteProposal.objects.create(
        request=quote_request, **serializer.validated_data
    )

    quote_request.status = "responded"
    quote_request.save(update_fields=["status", "updated_at"])

    _log_booking_event(quote_request, "musician", request.user, "proposta_enviada")

    return Response(
        QuoteProposalSerializer(proposal, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def contractor_accept_proposal(request, request_id):
    quote_request = get_object_or_404(QuoteRequest, id=request_id)

    if not hasattr(request.user, "contractor_profile"):
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    if quote_request.contractor != request.user.contractor_profile:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    if quote_request.status not in ["pending", "responded"]:
        return Response(
            {"detail": "Este pedido não pode ser reservado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    proposal_id = request.data.get("proposal_id")
    if not proposal_id:
        return Response(
            {"detail": "proposal_id é obrigatório."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    proposal = get_object_or_404(QuoteProposal, id=proposal_id, request=quote_request)
    if proposal.status != "sent":
        return Response(
            {"detail": "Esta proposta não está disponível para aceite."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    QuoteProposal.objects.filter(request=quote_request).exclude(id=proposal.id).update(
        status="declined"
    )
    proposal.status = "accepted"
    proposal.save(update_fields=["status"])

    quote_request.status = "reserved"
    quote_request.save(update_fields=["status", "updated_at"])

    booking, _ = Booking.objects.get_or_create(request=quote_request)

    _log_booking_event(quote_request, "contractor", request.user, "reserva_confirmada")

    return Response(
        {
            "request": QuoteRequestSerializer(
                quote_request, context={"request": request}
            ).data,
            "booking": BookingSerializer(booking, context={"request": request}).data,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def musician_confirm_booking(request, request_id):
    quote_request = get_object_or_404(QuoteRequest, id=request_id)

    try:
        musician = request.user.musician_profile
    except Musician.DoesNotExist:
        return Response(
            {"detail": "Perfil de músico não encontrado"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if quote_request.musician != musician:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    if quote_request.status != "reserved":
        return Response(
            {"detail": "Este pedido ainda não foi reservado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    booking = getattr(quote_request, "booking", None)
    if not booking:
        return Response(
            {"detail": "Reserva não encontrada."}, status=status.HTTP_404_NOT_FOUND
        )
    if booking.status != "reserved":
        return Response(
            {"detail": "Esta reserva não pode ser confirmada."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    booking.status = "confirmed"
    booking.confirmed_at = timezone.now()
    booking.save(update_fields=["status", "confirmed_at"])

    quote_request.status = "confirmed"
    quote_request.save(update_fields=["status", "updated_at"])

    _log_booking_event(quote_request, "musician", request.user, "reserva_confirmada")

    return Response(BookingSerializer(booking, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_quote_proposals(request, request_id):
    """Lista todas as propostas de um pedido específico"""
    quote_request = get_object_or_404(QuoteRequest, id=request_id)

    is_contractor = (
        hasattr(request.user, "contractor_profile")
        and quote_request.contractor == request.user.contractor_profile
    )
    is_musician = (
        hasattr(request.user, "musician_profile")
        and quote_request.musician == request.user.musician_profile
    )

    if not is_contractor and not is_musician:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    proposals = QuoteProposal.objects.filter(request=quote_request).order_by(
        "-created_at"
    )
    serializer = QuoteProposalSerializer(
        proposals, many=True, context={"request": request}
    )
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def decline_quote_proposal(request, request_id, proposal_id):
    """Contratante recusa uma proposta específica"""
    quote_request = get_object_or_404(QuoteRequest, id=request_id)

    if not hasattr(request.user, "contractor_profile"):
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    if quote_request.contractor != request.user.contractor_profile:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    if quote_request.status not in ["pending", "responded"]:
        return Response(
            {"detail": "Este pedido não aceita mais propostas"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    proposal = get_object_or_404(QuoteProposal, id=proposal_id, request=quote_request)
    proposal.status = "declined"
    proposal.save(update_fields=["status"])

    _log_booking_event(
        quote_request,
        "contractor",
        request.user,
        "proposta_recusada",
        {"proposal_id": proposal_id},
    )

    return Response({"message": "Proposta recusada"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_quote_request(request, request_id):
    """Contratante cancela pedido de orçamento"""
    quote_request = get_object_or_404(QuoteRequest, id=request_id)

    if not hasattr(request.user, "contractor_profile"):
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    if quote_request.contractor != request.user.contractor_profile:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    if quote_request.status in ["confirmed", "completed", "cancelled", "reserved"]:
        return Response(
            {"detail": "Não é possível cancelar este pedido"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    reason = request.data.get("reason", "")
    quote_request.status = "cancelled"
    quote_request.save(update_fields=["status", "updated_at"])

    QuoteProposal.objects.filter(request=quote_request, status="sent").update(
        status="expired"
    )

    _log_booking_event(
        quote_request,
        "contractor",
        request.user,
        "pedido_cancelado",
        {"reason": reason},
    )

    return Response({"message": "Pedido cancelado"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_booking(request, request_id):
    """Cancela uma reserva (contratante ou músico)"""
    booking = get_object_or_404(Booking, id=request_id)
    quote_request = booking.request

    is_contractor = (
        hasattr(request.user, "contractor_profile")
        and quote_request.contractor == request.user.contractor_profile
    )
    is_musician = (
        hasattr(request.user, "musician_profile")
        and quote_request.musician == request.user.musician_profile
    )

    if not is_contractor and not is_musician:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    if booking.status in ["completed", "cancelled"]:
        return Response(
            {"detail": "Esta reserva não pode mais ser cancelada"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    reason = request.data.get("reason", "")
    booking.status = "cancelled"
    booking.cancel_reason = reason
    booking.save(update_fields=["status", "cancel_reason"])

    quote_request.status = "cancelled"
    quote_request.save(update_fields=["status", "updated_at"])

    QuoteProposal.objects.filter(request=quote_request, status="sent").update(
        status="expired"
    )

    actor_type = "contractor" if is_contractor else "musician"
    _log_booking_event(
        quote_request, actor_type, request.user, "reserva_cancelada", {"reason": reason}
    )

    return Response({"message": "Reserva cancelada"})


# =============================================================================
# Public/Contractor views
# =============================================================================


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([PublicRateThrottle])
def list_musicians_by_city(request):
    city = request.query_params.get("city")
    state = request.query_params.get("state")

    if not city or not state:
        return Response(
            {"detail": "Parâmetros city e state são obrigatórios"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    queryset = Musician.objects.filter(
        is_active=True,
        city__iexact=city,
        state__iexact=state,
    ).select_related("user")

    queryset = queryset.order_by("-average_rating", "user__first_name")

    instrument = request.query_params.get("instrument")
    if instrument:
        queryset = queryset.filter(
            Q(instrument__iexact=instrument) | Q(instruments__icontains=instrument)
        )

    # Paginação para evitar payloads grandes em cidades populosas
    paginator = PageNumberPagination()
    paginator.page_size = 50
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = MusicianPublicSerializer(
            page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)

    serializer = MusicianPublicSerializer(
        queryset, many=True, context={"request": request}
    )
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([PublicRateThrottle])
def list_sponsors(request):
    city = request.query_params.get("city")
    state = request.query_params.get("state")

    if not city or not state:
        return Response(
            {"detail": "Parâmetros city e state são obrigatórios"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    queryset = Organization.objects.filter(
        is_sponsor=True,
        city__iexact=city,
        state__iexact=state,
    )

    sponsors = list(queryset.order_by("sponsor_tier", "id"))
    if sponsors:
        day_offset = date.today().toordinal() % len(sponsors)
        sponsors = sponsors[day_offset:] + sponsors[:day_offset]

    serializer = OrganizationPublicSerializer(
        sponsors, many=True, context={"request": request}
    )
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([PublicRateThrottle])
def list_all_musicians_public(request):
    """Lista músicos de todas as cidades (catálogo público)"""
    city = request.query_params.get("city")
    state = request.query_params.get("state")
    instrument = request.query_params.get("instrument")
    search = request.query_params.get("search")
    min_rating = request.query_params.get("min_rating")
    max_limit = 200
    default_limit = 100
    try:
        limit = int(request.query_params.get("limit", default_limit))
    except (TypeError, ValueError):
        limit = default_limit
    limit = max(1, min(limit, max_limit))

    queryset = Musician.objects.filter(is_active=True).select_related("user")

    if city:
        queryset = queryset.filter(city__iexact=city)
    if state:
        queryset = queryset.filter(state__iexact=state)
    if instrument:
        queryset = queryset.filter(
            Q(instrument__iexact=instrument) | Q(instruments__icontains=instrument)
        )
    if search:
        queryset = queryset.filter(
            Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
            | Q(instrument__icontains=search)
        )
    if min_rating:
        queryset = queryset.filter(average_rating__gte=min_rating)

    queryset = queryset.order_by("-average_rating", "user__first_name")

    paginator = PageNumberPagination()
    paginator.page_size = limit
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = MusicianPublicSerializer(
            page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)

    serializer = MusicianPublicSerializer(
        queryset[:limit], many=True, context={"request": request}
    )
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([PublicRateThrottle])
def get_musician_public_profile(request, musician_id):
    musician = get_object_or_404(Musician, id=musician_id, is_active=True)
    serializer = MusicianPublicSerializer(musician, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_contractor_dashboard(request):
    if not hasattr(request.user, "contractor_profile"):
        return Response(
            {"detail": "Usuário não pertence a um contratante"},
            status=status.HTTP_403_FORBIDDEN,
        )

    contractor = request.user.contractor_profile
    sent_requests = QuoteRequest.objects.filter(contractor=contractor)
    pending = sent_requests.filter(status="pending").count()
    responded = sent_requests.filter(status="responded").count()
    reserved = sent_requests.filter(status="reserved").count()

    return Response(
        {
            "contractor": ContractorProfileSerializer(
                contractor, context={"request": request}
            ).data,
            "stats": {
                "total_sent": sent_requests.count(),
                "pending": pending,
                "responded": responded,
                "reserved": reserved,
            },
        }
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_contractor_profile(request):
    if not hasattr(request.user, "contractor_profile"):
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    contractor = request.user.contractor_profile
    serializer = ContractorProfileSerializer(
        contractor,
        data=request.data,
        partial=True,
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()

    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_unread_messages_count(request):
    try:
        musician = request.user.musician_profile
    except Musician.DoesNotExist:
        return Response({"count": 0})

    count = QuoteRequest.objects.filter(musician=musician, status="pending").count()

    return Response({"count": count})


# =============================================================================
# Musician Contact (Protected - Only Contractors)
# =============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_musician_contact(request, musician_id):
    """
    GET /api/musicians/<id>/contact/
    Retorna contato do músico (WhatsApp/phone) apenas para contractors autenticados.
    Registra visualização para auditoria.
    """
    # Verifica se é contractor
    if not hasattr(request.user, "contractor_profile"):
        return Response(
            {"detail": "Apenas contratantes podem ver contatos"},
            status=status.HTTP_403_FORBIDDEN,
        )

    musician = get_object_or_404(Musician, pk=musician_id, is_active=True)

    # Registra visualização para auditoria
    ContactView.objects.create(
        contractor=request.user.contractor_profile,
        musician=musician,
        ip_address=request.META.get("REMOTE_ADDR"),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
    )

    return Response({
        "whatsapp": musician.whatsapp,
        "phone": musician.phone,
        "instagram": musician.instagram,
    })
