# agenda/view_functions.py
"""
Views funcionais (api_view) extraidas do views.py monolitico.
Mantem compatibilidade com as rotas em agenda/urls.py.
"""

import logging
from datetime import date

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
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
    Connection,
    ContactRequest,
    Event,
    Membership,
    Musician,
    MusicianBadge,
    MusicianRating,
    MusicianRequest,
    Organization,
)
from .serializers import (
    ContactRequestCreateSerializer,
    ContactRequestReplySerializer,
    ContactRequestSerializer,
    MusicianPublicSerializer,
    MusicianRatingSerializer,
    MusicianRequestAdminSerializer,
    MusicianRequestCreateSerializer,
    OrganizationPublicSerializer,
    OrganizationSerializer,
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
        return Response({"detail": "Perfil não encontrado"}, status=status.HTTP_404_NOT_FOUND)
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
        return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        return Response({"detail": "Perfil não encontrado"}, status=status.HTTP_404_NOT_FOUND)
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
        return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
                        request.build_absolute_uri(target.avatar.url) if target.avatar else None
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
        return Response({"detail": "Músico não encontrado"}, status=status.HTTP_404_NOT_FOUND)
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
        serializer = MusicianRatingSerializer(reviews, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Musician.DoesNotExist:
        return Response({"detail": "Músico não encontrado"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        logger.exception("Erro ao buscar avaliações")
        return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
                    "awarded_at": badge.awarded_at.isoformat() if badge.awarded_at else None,
                }
            )
        return Response(badge_data, status=status.HTTP_200_OK)

    except Musician.DoesNotExist:
        return Response({"detail": "Músico não encontrado"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        logger.exception("Erro ao buscar badges")
        return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        return Response({"detail": "Músico não encontrado"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        logger.exception("Erro ao buscar estatísticas")
        return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        return Response({"detail": "Músico não encontrado"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        logger.exception("Erro ao verificar conexão")
        return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            {"detail": f"Solicitação já foi {musician_request.get_status_display().lower()}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    notes = request.data.get("admin_notes", "")
    invite_token = musician_request.approve(request.user, notes)

    try:
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        invite_url = f"{frontend_url}/cadastro/invite?token={invite_token}"
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
def reject_musician_request(request, request_id):
    if not request.user.is_staff:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    musician_request = get_object_or_404(MusicianRequest, id=request_id)

    if musician_request.status != "pending":
        return Response(
            {"detail": f"Solicitação já foi {musician_request.get_status_display().lower()}"},
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
        return Response({"detail": "Token não fornecido"}, status=status.HTTP_400_BAD_REQUEST)

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
        return Response({"detail": "Convite expirado"}, status=status.HTTP_400_BAD_REQUEST)

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
# Contact requests
# =============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_contact_request(request):
    try:
        membership = Membership.objects.filter(
            user=request.user,
            status="active",
            organization__org_type__in=["company", "venue"],
        ).first()

        if not membership:
            return Response(
                {"detail": "Apenas empresas podem enviar mensagens para músicos"},
                status=status.HTTP_403_FORBIDDEN,
            )

        organization = membership.organization
    except Exception:
        return Response(
            {"detail": "Erro ao verificar organização"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    serializer = ContactRequestCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    contact_request = serializer.save(
        from_organization=organization,
        from_user=request.user,
    )

    return Response(
        ContactRequestSerializer(contact_request, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_received_contact_requests(request):
    try:
        musician = request.user.musician_profile
    except Musician.DoesNotExist:
        return Response(
            {"detail": "Perfil de músico não encontrado"},
            status=status.HTTP_404_NOT_FOUND,
        )

    status_filter = request.query_params.get("status")
    queryset = ContactRequest.objects.filter(to_musician=musician).order_by("-created_at")

    if status_filter:
        queryset = queryset.filter(status=status_filter)

    serializer = ContactRequestSerializer(queryset, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sent_contact_requests(request):
    membership = Membership.objects.filter(
        user=request.user,
        status="active",
        organization__org_type__in=["company", "venue"],
    ).first()

    if not membership:
        return Response(
            {"detail": "Apenas empresas podem ver mensagens enviadas"},
            status=status.HTTP_403_FORBIDDEN,
        )

    queryset = ContactRequest.objects.filter(from_organization=membership.organization).order_by(
        "-created_at"
    )

    serializer = ContactRequestSerializer(queryset, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_contact_request(request, contact_id):
    contact_request = get_object_or_404(ContactRequest, id=contact_id)

    is_musician = (
        hasattr(request.user, "musician_profile")
        and contact_request.to_musician == request.user.musician_profile
    )
    is_sender = contact_request.from_user == request.user

    if not is_musician and not is_sender:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    if is_musician and contact_request.status == "pending":
        contact_request.mark_as_read()

    serializer = ContactRequestSerializer(contact_request, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reply_contact_request(request, contact_id):
    contact_request = get_object_or_404(ContactRequest, id=contact_id)

    try:
        musician = request.user.musician_profile
        if contact_request.to_musician != musician:
            return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)
    except Musician.DoesNotExist:
        return Response(
            {"detail": "Perfil de músico não encontrado"},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = ContactRequestReplySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    contact_request.reply(serializer.validated_data["reply_message"])

    return Response(ContactRequestSerializer(contact_request, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def archive_contact_request(request, contact_id):
    contact_request = get_object_or_404(ContactRequest, id=contact_id)

    is_musician = (
        hasattr(request.user, "musician_profile")
        and contact_request.to_musician == request.user.musician_profile
    )

    if not is_musician:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    contact_request.archive()
    return Response({"message": "Mensagem arquivada"})


# =============================================================================
# Public/Company views
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

    serializer = MusicianPublicSerializer(queryset, many=True, context={"request": request})
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

    serializer = OrganizationPublicSerializer(sponsors, many=True, context={"request": request})
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
def get_company_dashboard(request):
    membership = (
        Membership.objects.filter(
            user=request.user,
            status="active",
            organization__org_type__in=["company", "venue"],
        )
        .select_related("organization")
        .first()
    )

    if not membership:
        return Response(
            {"detail": "Usuário não pertence a uma empresa"},
            status=status.HTTP_403_FORBIDDEN,
        )

    organization = membership.organization

    sent_requests = ContactRequest.objects.filter(from_organization=organization)
    pending_replies = sent_requests.filter(status__in=["pending", "read"]).count()
    total_sent = sent_requests.count()
    replied = sent_requests.filter(status="replied").count()

    return Response(
        {
            "organization": OrganizationSerializer(organization, context={"request": request}).data,
            "stats": {
                "total_sent": total_sent,
                "pending_replies": pending_replies,
                "replied": replied,
            },
        }
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_company_profile(request):
    membership = (
        Membership.objects.filter(
            user=request.user,
            status="active",
            organization__org_type__in=["company", "venue"],
            role__in=["owner", "admin"],
        )
        .select_related("organization")
        .first()
    )

    if not membership:
        return Response({"detail": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)

    organization = membership.organization
    serializer = OrganizationSerializer(
        organization,
        data=request.data,
        partial=True,
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()

    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_musician_for_company(request, musician_id):
    membership = Membership.objects.filter(
        user=request.user,
        status="active",
        organization__org_type__in=["company", "venue"],
    ).first()

    if not membership:
        return Response(
            {"detail": "Apenas empresas podem acessar esta rota"},
            status=status.HTTP_403_FORBIDDEN,
        )

    musician = get_object_or_404(Musician, id=musician_id, is_active=True)
    serializer = MusicianPublicSerializer(musician, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_unread_messages_count(request):
    try:
        musician = request.user.musician_profile
    except Musician.DoesNotExist:
        return Response({"count": 0})

    count = ContactRequest.objects.filter(
        to_musician=musician,
        status="pending",
    ).count()

    return Response({"count": count})
