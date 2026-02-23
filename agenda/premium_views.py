# agenda/premium_views.py
"""
Endpoints premium: conteúdo acessível apenas a músicos com is_premium=True.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .external_integrations import fetch_portal_content
from .permissions import IsPremiumMusician


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsPremiumMusician])
def premium_portal(request):
    """
    Retorna editais culturais, festivais e leis de incentivo filtrados pelo
    estado (e opcionalmente cidade) do músico autenticado.

    Query params opcionais:
      - category: rouanet | aldir_blanc | festival | edital | premio | other
    """
    musician = request.user.musician_profile
    state = musician.state or ""
    city = musician.city or None

    items = fetch_portal_content(state, city)

    category = request.query_params.get("category")
    if category:
        items = [item for item in items if item.get("category") == category]

    return Response(items)
