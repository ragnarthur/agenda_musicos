# agenda/cities_views.py
# Views para registro de interesse em cidades
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from django.db.models import Q
from .models import CityInterest
import logging

logger = logging.getLogger(__name__)

CITIES_IN_EXPANSION = {
    "sao_paulo_sp": "São Paulo, SP",
    "belo_horizonte_mg": "Belo Horizonte, MG",
    "brasilia_df": "Brasília, DF",
}


@api_view(["POST"])
@permission_classes([AllowAny])
def register_city_interest(request):
    """
    POST /api/cities/interest/
    Registra interesse em cidades em breve.
    Endpoint público (sem autenticação).
    """
    email = request.data.get("email", "").strip()
    city_state = request.data.get("city_state", "").strip()

    if not email:
        return Response(
            {"detail": "Email é obrigatório."}, status=status.HTTP_400_BAD_REQUEST
        )

    if not city_state or city_state not in CITIES_IN_EXPANSION:
        valid_cities = ", ".join(f'"{k}"' for k in CITIES_IN_EXPANSION.keys())
        return Response(
            {
                "detail": f"Cidade inválida. Valores permitidos: {valid_cities}",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if "@" not in email or "." not in email:
        return Response(
            {"detail": "Email inválido."}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Verificar se já existe interesse neste email para esta cidade
        existing = CityInterest.objects.filter(
            email=email, city_state=city_state
        ).first()

        if existing:
            logger.info(f"Interesse já registrado: {email} - {city_state}")
            return Response(
                {
                    "detail": "Você já tem interesse registrado nesta cidade",
                    "already_exists": True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Criar novo registro
        city, state = city_state.split("_", 1)
        CityInterest.objects.create(
            email=email,
            city=city,
            state=state,
            ip_address=request.META.get("REMOTE_ADDR", "")[:45]
            if request.META.get("REMOTE_ADDR")
            else "",
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:200]
            if request.META.get("HTTP_USER_AGENT")
            else "",
        )

        logger.info(f"Novo interesse registrado: {email} - {city}, {state}")

        return Response(
            {
                "detail": "Interesse registrado com sucesso! Te avisaremos quando o GigFlow chegar.",
                "already_exists": False,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"Erro ao registrar interesse: {e}", exc_info=True)
        return Response(
            {
                "detail": "Erro ao registrar interesse. Tente novamente.",
                "error": "INTERNAL_ERROR",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def get_interests_stats(request):
    """
    GET /api/cities/interest/stats/
    Obtém estatísticas de interesses por cidade (público, para admin).
    """
    try:
        stats = {}
        total = CityInterest.objects.count()
        by_city = (
            CityInterest.objects.values("city", "state")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        for item in by_city[:10]:  # Top 10 cidades
            city_state = f"{item['city']}, {item['state']}"
            stats[city_state] = item["count"]
            stats["total"] = total

        stats["top_cities"] = by_city

        return Response(stats, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Erro ao obter estatísticas: {e}", exc_info=True)
        return Response(
            {"detail": "Erro ao obter estatísticas.", "error": "INTERNAL_ERROR"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
