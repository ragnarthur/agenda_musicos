def normalize_genre_value(value: str) -> str:
    """
    Normaliza gêneros musicais para armazenar e filtrar de forma consistente.
    Mantém acentos, mas padroniza caixa e espaços.
    """
    if not value:
        return ""
    return " ".join(value.strip().lower().split())
