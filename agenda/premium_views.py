# agenda/premium_views.py
"""
Endpoints premium: conteúdo acessível apenas a músicos com is_premium=True.
"""

import logging

from django.db.models import Case, IntegerField, Q, Value, When
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .external_integrations import fetch_portal_content
from .models import CulturalNotice
from .permissions import IsPremiumMusician
from .serializers import CulturalNoticeSerializer, PremiumPortalItemSerializer

logger = logging.getLogger(__name__)

SOURCE_LABELS = {
    "salic": "SALIC",
    "mapas_culturais": "Mapas Culturais",
    "curadoria_admin": "Curadoria",
}

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
UF_CODES = set(STATE_NAME_TO_UF.values())


def _scope_label(notice: CulturalNotice) -> str:
    return "municipal" if notice.city else "estadual"


def _normalize_state(value: str | None) -> str:
    raw = (value or "").strip().upper().replace(".", "")
    if not raw:
        return ""
    if len(raw) == 2 and raw in UF_CODES:
        return raw
    mapped = STATE_NAME_TO_UF.get(raw)
    if mapped:
        return mapped

    for separator in [",", "-", "/", "|"]:
        if separator not in raw:
            continue
        parts = [part.strip() for part in raw.split(separator) if part.strip()]
        for part in reversed(parts):
            if len(part) == 2 and part in UF_CODES:
                return part
            mapped = STATE_NAME_TO_UF.get(part)
            if mapped:
                return mapped
    return ""


def _normalize_city(value: str | None) -> str | None:
    city = (value or "").strip()
    if not city:
        return None
    # Alguns cadastros vêm como "Cidade, UF"; usamos só a cidade.
    if "," in city:
        city = city.split(",", 1)[0].strip()
    return city or None


def _infer_state_from_city(value: str | None) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""

    # Exemplo comum: "Monte Carmelo, MG"
    if "," in raw:
        maybe_state = raw.split(",", 1)[1].strip()
        normalized = _normalize_state(maybe_state)
        if len(normalized) == 2:
            return normalized

    # Exemplo comum: "Monte Carmelo - MG"
    tokens = raw.replace("-", " ").split()
    if tokens:
        normalized = _normalize_state(tokens[-1])
        if len(normalized) == 2:
            return normalized

    return ""


def _parse_bool_query(value: str | None) -> bool | None:
    raw = (value or "").strip().lower()
    if raw in {"1", "true", "yes", "sim"}:
        return True
    if raw in {"0", "false", "no", "nao", "não"}:
        return False
    return None


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


def _apply_admin_filters(queryset, request):
    state = _normalize_state(request.query_params.get("state"))
    city = _normalize_city(request.query_params.get("city"))
    category = (request.query_params.get("category") or "").strip()
    is_active = _parse_bool_query(request.query_params.get("is_active"))
    search = (request.query_params.get("search") or "").strip()

    if state:
        queryset = queryset.filter(state__iexact=state)
    if city:
        queryset = queryset.filter(city__iexact=city)
    if category:
        queryset = queryset.filter(category=category)
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search)
            | Q(summary__icontains=search)
            | Q(source_name__icontains=search)
            | Q(state__icontains=search)
            | Q(city__icontains=search)
        )
    return queryset


def _resolve_notice_scope(item: dict) -> tuple[str, str | None]:
    item_state = _normalize_state(item.get("state"))
    item_city = _normalize_city(item.get("city"))
    item_scope = item.get("scope")
    if item_scope != "municipal":
        item_city = None
    return item_state, item_city


def _find_existing_notice(item: dict, state: str, city: str | None):
    queryset = CulturalNotice.objects.filter(
        state__iexact=state, title__iexact=item.get("title", "")
    )
    if city:
        queryset = queryset.filter(city__iexact=city)
    else:
        queryset = queryset.filter(Q(city__isnull=True) | Q(city__exact=""))

    source_url = item.get("external_url")
    if source_url:
        by_url = queryset.filter(source_url=source_url).first()
        if by_url:
            return by_url
    return queryset.first()


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
        state = _infer_state_from_city(musician.city)

    category = request.query_params.get("category")

    base_queryset = (
        CulturalNotice.objects.filter(is_active=True, state__iexact=state) if state else None
    )
    if category:
        base_queryset = (
            base_queryset.filter(category=category) if base_queryset is not None else None
        )

    if base_queryset is not None and city:
        targeted_queryset = base_queryset.filter(
            Q(city__iexact=city) | Q(city__isnull=True) | Q(city__exact="")
        )
    elif base_queryset is not None:
        targeted_queryset = base_queryset.filter(Q(city__isnull=True) | Q(city__exact=""))
    else:
        targeted_queryset = CulturalNotice.objects.none()

    queryset = targeted_queryset
    # Fallback 1: sem conteúdo local/estadual, abre para conteúdos de outras cidades da mesma UF.
    if base_queryset is not None and not targeted_queryset.exists():
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
        queryset = _apply_admin_filters(CulturalNotice.objects.all(), request).order_by(
            "-published_at", "-created_at"
        )
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


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_cultural_notice_suggestions(request):
    """
    Sugestões vindas de fontes públicas para facilitar curadoria no painel admin.
    Query params:
      - state (obrigatório): UF
      - city (opcional)
      - category (opcional)
      - limit (opcional, 1..80)
    """
    state = _normalize_state(request.query_params.get("state"))
    city = _normalize_city(request.query_params.get("city"))
    category = (request.query_params.get("category") or "").strip()

    try:
        limit = int(request.query_params.get("limit", 40))
    except (TypeError, ValueError):
        limit = 40
    limit = max(1, min(limit, 80))

    if not state:
        return Response(
            {"detail": "Informe a UF (state) para buscar sugestões."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payload = fetch_portal_content(state=state, city=city)
    if category:
        payload = [item for item in payload if item.get("category") == category]
    payload = _validate_portal_payload(payload)[:limit]

    existing_queryset = CulturalNotice.objects.filter(state__iexact=state)
    if city:
        existing_queryset = existing_queryset.filter(
            Q(city__iexact=city) | Q(city__isnull=True) | Q(city__exact="")
        )

    url_to_notice_id = {
        notice.source_url: notice.id
        for notice in existing_queryset.exclude(source_url__isnull=True).exclude(
            source_url__exact=""
        )
    }
    title_to_notice_id = {
        (notice.title or "").strip().lower(): notice.id for notice in existing_queryset
    }

    items = []
    for item in payload:
        item_url = item.get("external_url")
        title_key = (item.get("title") or "").strip().lower()
        matched_notice_id = url_to_notice_id.get(item_url) if item_url else None
        if not matched_notice_id and title_key:
            matched_notice_id = title_to_notice_id.get(title_key)

        items.append(
            {
                **item,
                "already_published": bool(matched_notice_id),
                "matched_notice_id": matched_notice_id,
                "source_label": SOURCE_LABELS.get(item.get("source"), "Fonte pública"),
            }
        )

    return Response(
        {
            "state": state,
            "city": city,
            "category": category or None,
            "total": len(items),
            "items": items,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_import_cultural_notice_suggestions(request):
    """
    Importa sugestões selecionadas para CulturalNotice com ativação opcional.
    Body:
      - items: PremiumPortalItem[]
      - state (opcional): fallback de UF para itens sem state
      - city (opcional): fallback de cidade para itens sem city
      - activate (opcional, default=true)
    """
    raw_items = request.data.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        return Response(
            {"detail": "Envie uma lista de itens em `items`."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    request_state = _normalize_state(request.data.get("state"))
    request_city = _normalize_city(request.data.get("city"))
    activate = bool(request.data.get("activate", True))

    payload_serializer = PremiumPortalItemSerializer(data=raw_items, many=True)
    payload_serializer.is_valid(raise_exception=True)

    created = []
    updated = []
    skipped = []

    for item in payload_serializer.validated_data:
        item = dict(item)
        item_state, item_city = _resolve_notice_scope(item)
        if not item_state:
            item_state = request_state
        if item_scope := item.get("scope"):
            if item_scope == "municipal" and not item_city:
                item_city = request_city

        if not item_state:
            skipped.append({"title": item.get("title"), "reason": "state_missing"})
            continue

        existing = _find_existing_notice(item=item, state=item_state, city=item_city)
        source_name = SOURCE_LABELS.get(item.get("source"), "Fonte pública")

        data = {
            "title": item.get("title"),
            "summary": item.get("description") or "",
            "category": item.get("category"),
            "state": item_state,
            "city": item_city,
            "source_name": source_name,
            "source_url": item.get("external_url"),
            "deadline_at": item.get("deadline"),
            "event_date": item.get("event_date"),
            "published_at": item.get("published_at") or timezone.localdate(),
            "is_active": activate,
        }

        if existing:
            changed = False
            for field, value in data.items():
                if getattr(existing, field) != value:
                    setattr(existing, field, value)
                    changed = True
            if changed:
                existing.save()
            updated.append(existing)
            continue

        notice = CulturalNotice.objects.create(created_by=request.user, **data)
        created.append(notice)

    changed_items = created + updated
    serialized = CulturalNoticeSerializer(changed_items, many=True).data
    response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return Response(
        {
            "created": len(created),
            "updated": len(updated),
            "skipped": len(skipped),
            "items": serialized,
            "skipped_items": skipped[:20],
        },
        status=response_status,
    )
