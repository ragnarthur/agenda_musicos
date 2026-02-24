# agenda/external_integrations.py
"""
Integração com APIs públicas brasileiras de cultura para o Portal Premium.

Fontes:
  - SALIC API (Lei Rouanet): https://api.salic.cultura.gov.br
  - Mapas Culturais (instâncias federal e estaduais): https://mapa.cultura.gov.br
"""

import logging
import unicodedata
from datetime import datetime

import requests
from django.core.cache import cache

logger = logging.getLogger(__name__)

SALIC_BASE = "https://api.salic.cultura.gov.br/api/v1"

# Instâncias estaduais do Mapas Culturais; "default" = plataforma federal
MAPAS_INSTANCES = {
    "AC": "https://mapa.cultura.gov.br",
    "AL": "https://mapa.cultura.gov.br",
    "AP": "https://mapa.cultura.gov.br",
    "AM": "https://mapa.cultura.gov.br",
    "BA": "https://ba.mapas.cultura.gov.br",
    "CE": "https://mapa.cultura.gov.br",
    "DF": "https://mapa.cultura.gov.br",
    "ES": "https://mapa.cultura.gov.br",
    "GO": "https://mapa.cultura.gov.br",
    "MA": "https://mapa.cultura.gov.br",
    "MT": "https://mapa.cultura.gov.br",
    "MS": "https://mapa.cultura.gov.br",
    "MG": "https://mapaculturalbh.pbh.gov.br",
    "PA": "https://mapa.cultura.gov.br",
    "PB": "https://mapa.cultura.gov.br",
    "PR": "https://mapa.cultura.gov.br",
    "PE": "https://mapa.cultura.gov.br",
    "PI": "https://mapa.cultura.gov.br",
    "RJ": "https://mapa.cultura.gov.br",
    "RN": "https://mapa.cultura.gov.br",
    "RS": "https://mapa.cultura.gov.br",
    "RO": "https://mapa.cultura.gov.br",
    "RR": "https://mapa.cultura.gov.br",
    "SC": "https://mapa.cultura.gov.br",
    "SP": "https://spcultura.prefeitura.sp.gov.br",
    "SE": "https://mapa.cultura.gov.br",
    "TO": "https://mapa.cultura.gov.br",
    "default": "https://mapa.cultura.gov.br",
}

CACHE_TTL = 60 * 60 * 6  # 6 horas
REQUEST_TIMEOUT = 12  # segundos

FALLBACK_FEDERAL_ITEMS = [
    {
        "source": "curadoria_admin",
        "external_id": "federal_pnab_faq",
        "title": "PNAB — Perguntas Frequentes (Ministério da Cultura)",
        "description": "Informações oficiais da Política Nacional Aldir Blanc (PNAB).",
        "category": "aldir_blanc",
        "scope": "nacional",
        "state": None,
        "city": None,
        "external_url": "https://www.gov.br/cultura/pt-br/acesso-a-informacao/perguntas-frequentes/politica-nacional-aldir-blanc-pnab",
        "deadline": None,
        "event_date": None,
    }
]

FALLBACK_STATE_ITEMS = {
    "MG": [
        {
            "source": "curadoria_admin",
            "external_id": "mg_pnab_editais",
            "title": "Editais PNAB — Secult Minas Gerais",
            "description": "Página oficial com editais e resultados da PNAB em Minas Gerais.",
            "category": "aldir_blanc",
            "scope": "estadual",
            "state": "MG",
            "city": None,
            "external_url": "https://www.secult.mg.gov.br/editais/editais-pnab/editais-pnab",
            "deadline": None,
            "event_date": None,
        }
    ]
}

FALLBACK_CITY_ITEMS = {
    ("MG", "monte carmelo"): [
        {
            "source": "curadoria_admin",
            "external_id": "monte_carmelo_pnab_ciclo2",
            "title": "PNAB - Política Nacional Aldir Blanc - Ciclo 2 (Monte Carmelo)",
            "description": "Consulta pública e informações municipais da PNAB no site da Prefeitura de Monte Carmelo.",
            "category": "aldir_blanc",
            "scope": "municipal",
            "state": "MG",
            "city": "Monte Carmelo",
            "external_url": "https://www.montecarmelo.mg.gov.br/pnab-ciclo-2",
            "deadline": None,
            "event_date": None,
        }
    ]
}


def fetch_portal_content(state: str, city: str | None) -> list[dict]:
    """
    Agrega conteúdo cultural de SALIC + Mapas Culturais para o estado/cidade.
    Usa cache por (state, city) com TTL de 6 horas.
    Sempre retorna lista (vazia em caso de falha total).
    """
    if not state:
        published_at = _today_str()
        return [{**item, "published_at": published_at} for item in FALLBACK_FEDERAL_ITEMS]

    cache_key = f"portal_cultural_{state.upper()}_{(city or 'all').lower()}"
    cached = cache.get(cache_key)
    if cached is not None:
        hydrated_cached = _ensure_scope_coverage(cached, state, city)
        if hydrated_cached != cached:
            cache.set(cache_key, hydrated_cached, CACHE_TTL)
        return hydrated_cached

    results = []

    # Rouanet via SALIC
    results += _fetch_salic(state, city)

    # Oportunidades/editais via Mapas Culturais federal
    results += _fetch_mapas_oportunidades("default", state, city)

    # Instância estadual (se diferente da federal)
    state_instance = MAPAS_INSTANCES.get(state.upper(), "default")
    if state_instance != MAPAS_INSTANCES["default"]:
        results += _fetch_mapas_oportunidades(state.upper(), state, city)

    # Eventos culturais (festivais) via Mapas Culturais
    results += _fetch_mapas_eventos("default", state, city)

    # Deduplica por (source, external_id)
    seen: set[tuple] = set()
    unique = []
    for item in results:
        key = (item["source"], item["external_id"])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    # Ordena: itens com deadline primeiro (mais próximo), sem deadline ao final
    def sort_key(item):
        deadline = item.get("deadline")
        published = item.get("published_at") or ""
        return (deadline is None, deadline or "", published)

    unique.sort(key=sort_key)
    unique = _ensure_scope_coverage(unique, state, city)

    cache.set(cache_key, unique, CACHE_TTL)
    return unique


# ---------------------------------------------------------------------------
# SALIC API — Lei Rouanet
# ---------------------------------------------------------------------------


def _fetch_salic(state: str, city: str | None) -> list[dict]:
    """Busca propostas Lei Rouanet via SALIC API filtradas por UF/município."""
    params: dict = {
        "UF": state.upper(),
        "limit": 50,
        "offset": 0,
        "format": "json",
    }
    if city:
        params["municipio"] = city

    try:
        resp = requests.get(f"{SALIC_BASE}/propostas", params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("_embedded", {}).get("propostas", [])
        return [_normalize_salic(item) for item in items if item]
    except Exception as exc:
        logger.warning("SALIC fetch failed for state=%s city=%s: %s", state, city, exc)
        return []


def _normalize_salic(item: dict) -> dict:
    """Converte item SALIC para schema unificado do portal."""
    pronac = item.get("PRONAC") or item.get("pronac") or ""
    return {
        "source": "salic",
        "external_id": str(pronac),
        "title": item.get("NomeProjeto") or item.get("nome") or "Projeto Rouanet",
        "description": item.get("Sinopse") or item.get("sinopse") or "",
        "category": "rouanet",
        "scope": "estadual",
        "state": item.get("UfProjeto") or item.get("uf") or "",
        "city": item.get("CidadeProjeto") or item.get("municipio") or "",
        "external_url": (
            f"https://salic.cultura.gov.br/autenticacao/index/visualizar/" f"pronac/{pronac}"
            if pronac
            else None
        ),
        "deadline": None,
        "event_date": _parse_salic_date(item.get("DtInicioExecucao") or item.get("data_inicio")),
        "published_at": _parse_salic_date(item.get("DtInicioExecucao") or item.get("data_inicio"))
        or _today_str(),
    }


def _parse_salic_date(value) -> str | None:
    if not value:
        return None
    # SALIC retorna datas em formato /Date(timestamp)/ ou "YYYY-MM-DD"
    if isinstance(value, str):
        if value.startswith("/Date("):
            try:
                ts = int(value[6:-2]) / 1000
                return datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
            except Exception:
                return None
        # Tenta ISO
        try:
            return str(datetime.fromisoformat(value[:10]).date())
        except Exception:
            return None
    return None


# ---------------------------------------------------------------------------
# Mapas Culturais — Oportunidades/Editais
# ---------------------------------------------------------------------------


def _fetch_mapas_oportunidades(instance_key: str, state: str, city: str | None) -> list[dict]:
    """Busca oportunidades (editais/chamadas) em uma instância Mapas Culturais."""
    base_url = MAPAS_INSTANCES.get(instance_key, MAPAS_INSTANCES["default"])
    params: dict = {
        "@select": "id,name,shortDescription,registrationFrom,registrationTo,singleUrl",
        "@limit": 40,
    }

    try:
        url = f"{base_url}/api/opportunity/find"
        resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, list):
            return []
        return [_normalize_mapas_opportunity(item, base_url) for item in data if item]
    except Exception as exc:
        logger.warning(
            "Mapas Culturais opportunity fetch failed instance=%s state=%s: %s",
            instance_key,
            state,
            exc,
        )
        return []


def _normalize_mapas_opportunity(item: dict, base_url: str) -> dict:
    item_id = str(item.get("id", ""))
    single_url = item.get("singleUrl") or f"{base_url}/oportunidade/{item_id}"
    reg_to = item.get("registrationTo") or item.get("registrationFrom")

    return {
        "source": "mapas_culturais",
        "external_id": f"opp_{item_id}",
        "title": item.get("name") or "Oportunidade Cultural",
        "description": item.get("shortDescription") or "",
        "category": _guess_category_from_name(item.get("name") or ""),
        "scope": "estadual",
        "state": None,
        "city": None,
        "external_url": single_url,
        "deadline": _parse_mapas_date(reg_to),
        "event_date": None,
        "published_at": _parse_mapas_date(item.get("registrationFrom")) or _today_str(),
    }


# ---------------------------------------------------------------------------
# Mapas Culturais — Eventos (festivais)
# ---------------------------------------------------------------------------


def _fetch_mapas_eventos(instance_key: str, state: str, city: str | None) -> list[dict]:
    """Busca eventos culturais (festivais, shows públicos) em uma instância Mapas Culturais."""
    base_url = MAPAS_INSTANCES.get(instance_key, MAPAS_INSTANCES["default"])
    params: dict = {
        "@select": "id,name,shortDescription,occurrences,singleUrl",
        "@limit": 30,
        "terms": '{"linguagem":["Música"]}',
    }

    try:
        url = f"{base_url}/api/event/find"
        resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, list):
            return []
        return [_normalize_mapas_event(item, base_url) for item in data if item]
    except Exception as exc:
        logger.warning(
            "Mapas Culturais event fetch failed instance=%s state=%s: %s",
            instance_key,
            state,
            exc,
        )
        return []


def _normalize_mapas_event(item: dict, base_url: str) -> dict:
    item_id = str(item.get("id", ""))
    single_url = item.get("singleUrl") or f"{base_url}/evento/{item_id}"

    # Tenta pegar data do primeiro occurrence
    event_date = None
    occurrences = item.get("occurrences") or []
    if occurrences and isinstance(occurrences, list):
        first = occurrences[0] if occurrences else {}
        event_date = _parse_mapas_date(first.get("startsOn") or first.get("starts_at"))

    return {
        "source": "mapas_culturais",
        "external_id": f"evt_{item_id}",
        "title": item.get("name") or "Evento Cultural",
        "description": item.get("shortDescription") or "",
        "category": "festival",
        "scope": "estadual",
        "state": None,
        "city": None,
        "external_url": single_url,
        "deadline": None,
        "event_date": event_date,
        "published_at": event_date or _today_str(),
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_mapas_date(value) -> str | None:
    if not value:
        return None
    if isinstance(value, str):
        try:
            return str(datetime.fromisoformat(value[:10]).date())
        except Exception:
            return None
    return None


def _today_str() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _guess_category_from_name(name: str) -> str:
    name_lower = name.lower()
    if any(w in name_lower for w in ["festival", "festa", "show", "concerto"]):
        return "festival"
    if any(w in name_lower for w in ["aldir", "pnab", "lei 14"]):
        return "aldir_blanc"
    if any(w in name_lower for w in ["rouanet", "pronac"]):
        return "rouanet"
    if any(w in name_lower for w in ["prêmio", "premio", "concurso"]):
        return "premio"
    if any(w in name_lower for w in ["edital", "chamada", "seleção", "selecao"]):
        return "edital"
    return "edital"


def _normalize_city_key(value: str | None) -> str:
    if not value:
        return ""
    city = value.split(",", 1)[0].strip().lower()
    city = unicodedata.normalize("NFKD", city)
    city = "".join(ch for ch in city if not unicodedata.combining(ch))
    return " ".join(city.split())


def _fallback_items_for_location(state: str, city: str | None) -> list[dict]:
    normalized_state = (state or "").strip().upper()
    city_key = _normalize_city_key(city)

    fallback_items: list[dict] = []
    fallback_items.extend(FALLBACK_FEDERAL_ITEMS)
    fallback_items.extend(FALLBACK_STATE_ITEMS.get(normalized_state, []))
    fallback_items.extend(FALLBACK_CITY_ITEMS.get((normalized_state, city_key), []))

    published_at = _today_str()
    return [{**item, "published_at": published_at} for item in fallback_items]


def _ensure_scope_coverage(items: list[dict], state: str, city: str | None) -> list[dict]:
    """
    Garante que o feed tenha cobertura mínima:
      - nacional
      - estadual
      - municipal (quando existir fallback para a cidade)
    """
    fallback_items = _fallback_items_for_location(state, city)
    if not items:
        return fallback_items

    merged = list(items)
    seen_keys = {
        (item.get("source"), item.get("external_id"))
        for item in merged
        if item.get("source") and item.get("external_id")
    }
    existing_scopes = {item.get("scope") for item in merged}

    for fallback in fallback_items:
        key = (fallback.get("source"), fallback.get("external_id"))
        scope = fallback.get("scope")
        if key in seen_keys:
            continue
        if scope in existing_scopes:
            continue
        merged.append(fallback)
        seen_keys.add(key)
        existing_scopes.add(scope)

    return merged
