# agenda/premium_views.py
"""
Endpoints premium: conteúdo acessível apenas a músicos com is_premium=True.
"""

import logging

from django.db.models import Case, IntegerField, Q, Value, When
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .external_integrations import fetch_portal_content
from .models import CulturalNotice
from .permissions import IsPremiumMusician
from .serializers import CulturalNoticeSerializer, PremiumPortalItemSerializer

logger = logging.getLogger(__name__)

STATE_NAME_TO_UF = {
    "ACRE": "AC",
    "ALAGOAS": "AL",
    "AMAPA": "AP",
    "AMAZONAS": "AM",
    "BAHIA": "BA",
    "CEARA": "CE",
    "DISTRITO FEDERAL": "DF",
    "ESPIRITO SANTO": "ES",
    "GOIAS": "GO",
    "MARANHAO": "MA",
    "MATO GROSSO": "MT",
    "MATO GROSSO DO SUL": "MS",
    "MINAS GERAIS": "MG",
    "PARA": "PA",
    "PARAIBA": "PB",
    "PARANA": "PR",
    "PERNAMBUCO": "PE",
    "PIAUI": "PI",
    "RIO DE JANEIRO": "RJ",
    "RIO GRANDE DO NORTE": "RN",
    "RIO GRANDE DO SUL": "RS",
    "RONDONIA": "RO",
    "RORAIMA": "RR",
    "SANTA CATARINA": "SC",
    "SAO PAULO": "SP",
    "SERGIPE": "SE",
    "TOCANTINS": "TO",
}


def _scope_label(notice: CulturalNotice) -> str:
    return "municipal" if notice.city else "estadual"


def _normalize_state(value: str | None) -> str:
    raw = (value or "").strip().upper()
    if len(raw) == 2:
        return raw
    return STATE_NAME_TO_UF.get(raw, raw)


def _normalize_city(value: str | None) -> str | None:
    city = (value or "").strip()
    if not city:
        return None
    # Alguns cadastros vêm como "Cidade, UF"; usamos só a cidade.
    if "," in city:
        city = city.split(",", 1)[0].strip()
    return city or None


def _apply_base_ordering(queryset, city: str | None):
    if city:
        queryset = queryset.annotate(
            location_rank=Case(
                When(city__iexact=city, then=Value(0)),
                When(Q(city__isnull=True) | Q(city__exact=""), then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            )
        )
    else:
        queryset = queryset.annotate(
            location_rank=Case(
                When(Q(city__isnull=True) | Q(city__exact=""), then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )

    return queryset.annotate(
        deadline_rank=Case(
            When(deadline_at__isnull=True, then=Value(1)),
            default=Value(0),
            output_field=IntegerField(),
        )
    ).order_by("location_rank", "deadline_rank", "deadline_at", "-published_at", "-created_at")


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


def _validate_portal_payload(payload: list[dict]) -> list[dict]:
    """
    Valida item a item para evitar 400 no endpoint inteiro quando uma fonte externa
    retornar um registro malformado.
    """
    validated_items: list[dict] = []
    for item in payload:
        serializer = PremiumPortalItemSerializer(data=item)
        if serializer.is_valid():
            validated_items.append(serializer.data)
            continue
        logger.warning(
            "Skipping invalid premium portal item: errors=%s item=%s", serializer.errors, item
        )
    return validated_items


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
    state = _normalize_state(musician.state)
    city = _normalize_city(musician.city)

    if not state:
        return Response([])

    category = request.query_params.get("category")

    base_queryset = CulturalNotice.objects.filter(is_active=True, state__iexact=state)
    if category:
        base_queryset = base_queryset.filter(category=category)

    if city:
        targeted_queryset = base_queryset.filter(
            Q(city__iexact=city) | Q(city__isnull=True) | Q(city__exact="")
        )
    else:
        targeted_queryset = base_queryset.filter(Q(city__isnull=True) | Q(city__exact=""))

    queryset = targeted_queryset
    # Fallback 1: sem conteúdo local/estadual, abre para conteúdos de outras cidades da mesma UF.
    if not targeted_queryset.exists():
        queryset = base_queryset

    queryset = _apply_base_ordering(queryset, city)
    payload = [_to_portal_item(notice) for notice in queryset]

    # Fallback 2: sem curadoria interna, usa fontes públicas externas.
    if not payload:
        payload = fetch_portal_content(state=state, city=city)
        if category:
            payload = [item for item in payload if item.get("category") == category]

    return Response(_validate_portal_payload(payload))


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
