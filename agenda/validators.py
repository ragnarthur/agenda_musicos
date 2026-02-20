# agenda/validators.py
import re

from rest_framework import serializers

_HTML_TAG_RE = re.compile(r'<[^>]+>', re.DOTALL)
_DANGEROUS_PROTO_RE = re.compile(r'javascript\s*:', re.IGNORECASE)


def sanitize_string(value, *, max_length=None, allow_empty=True, to_lower=False, to_upper=False):
    """
    Sanitiza uma string: remove tags HTML, protocolos perigosos, trim, normaliza case e valida tamanho.
    Retorna None para strings vazias quando allow_empty=True.
    """
    if value is None:
        return None
    if not isinstance(value, str):
        return value
    cleaned = value.strip()
    if not cleaned:
        if allow_empty:
            return None
        raise serializers.ValidationError(
            "Este campo não pode estar vazio ou conter apenas espaços."
        )
    # Remove tags HTML e protocolos perigosos
    cleaned = _HTML_TAG_RE.sub('', cleaned)
    cleaned = _DANGEROUS_PROTO_RE.sub('', cleaned)
    cleaned = cleaned.strip()
    if not cleaned:
        if allow_empty:
            return None
        raise serializers.ValidationError(
            "Este campo não pode estar vazio ou conter apenas espaços."
        )
    if to_lower:
        cleaned = cleaned.lower()
    if to_upper:
        cleaned = cleaned.upper()
    if max_length and len(cleaned) > max_length:
        raise serializers.ValidationError(
            f"Este campo não pode ter mais de {max_length} caracteres."
        )
    return cleaned


def validate_not_empty_string(value):
    """
    Valida que a string não é vazia após remover espaços.
    """
    if isinstance(value, str) and not value.strip():
        raise serializers.ValidationError(
            "Este campo não pode estar vazio ou conter apenas espaços."
        )
    return value.strip() if isinstance(value, str) else value


def validate_max_length(max_length):
    """
    Retorna um validator que verifica tamanho máximo de string.
    Útil para prevenir DoS em queries.
    """

    def validator(value):
        if isinstance(value, str) and len(value) > max_length:
            raise serializers.ValidationError(
                f"Este campo não pode ter mais de {max_length} caracteres."
            )
        return value

    return validator
