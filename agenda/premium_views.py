# agenda/premium_views.py
"""
Endpoints premium: conteúdo acessível apenas a músicos com is_premium=True.
"""

from django.db.models import Case, IntegerField, Q, Value, When
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import CulturalNotice
from .permissions import IsPremiumMusician
from .serializers import CulturalNoticeSerializer, PremiumPortalItemSerializer


def _scope_label(notice: CulturalNotice) -> str:
    return "municipal" if notice.city else "estadual"


def _to_portal_item(notice: CulturalNotice) -> dict:
    return {
        "source": "curadoria_admin",
        "external_id": f"notice_{notice.id}",
        "title": notice.title,
        "description": notice.summary or "",
        "category": notice.category,
        "scope": _scope_label(notice),
        "state": notice.state,
        "city": notice.city,
        "external_url": notice.source_url,
        "deadline": notice.deadline_at,
        "event_date": notice.event_date,
        "published_at": notice.published_at,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsPremiumMusician])
def premium_portal(request):
    """
    Retorna editais culturais, festivais e leis de incentivo filtrados pelo
    estado (e opcionalmente cidade) do músico autenticado.

    Query params opcionais:
      - category: rouanet | aldir_blanc | festival | edital | premio | noticia | other
    """
    musician = request.user.musician_profile
    state = musician.state or ""
    city = musician.city or None

    if not state:
        return Response([])

    queryset = CulturalNotice.objects.filter(is_active=True, state__iexact=state)
    if city:
        queryset = queryset.filter(Q(city__iexact=city) | Q(city__isnull=True) | Q(city__exact=""))
    else:
        queryset = queryset.filter(Q(city__isnull=True) | Q(city__exact=""))

    category = request.query_params.get("category")
    if category:
        queryset = queryset.filter(category=category)

    queryset = queryset.annotate(
        deadline_rank=Case(
            When(deadline_at__isnull=True, then=Value(1)),
            default=Value(0),
            output_field=IntegerField(),
        )
    ).order_by("deadline_rank", "deadline_at", "-published_at", "-created_at")

    payload = [_to_portal_item(notice) for notice in queryset]
    serializer = PremiumPortalItemSerializer(data=payload, many=True)
    serializer.is_valid(raise_exception=True)
    return Response(serializer.data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_cultural_notices(request):
    """
    Lista e cria conteúdos do Portal Cultural Premium (admin).
    """
    if request.method == "GET":
        queryset = CulturalNotice.objects.all().order_by("-published_at", "-created_at")
        serializer = CulturalNoticeSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = CulturalNoticeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    notice = serializer.save(created_by=request.user)
    return Response(CulturalNoticeSerializer(notice).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_cultural_notice_detail(request, notice_id):
    """
    Detalhe, atualização e remoção de um conteúdo premium (admin).
    """
    notice = CulturalNotice.objects.filter(id=notice_id).first()
    if not notice:
        return Response({"detail": "Conteúdo não encontrado."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(CulturalNoticeSerializer(notice).data)

    if request.method == "PATCH":
        serializer = CulturalNoticeSerializer(notice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CulturalNoticeSerializer(notice).data)

    notice.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
