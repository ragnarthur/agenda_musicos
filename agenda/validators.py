# agenda/validators.py
from rest_framework import serializers


def validate_not_empty_string(value):
    """
    Valida que a string não é vazia após remover espaços.
    """
    if isinstance(value, str) and not value.strip():
        raise serializers.ValidationError('Este campo não pode estar vazio ou conter apenas espaços.')
    return value.strip() if isinstance(value, str) else value


def validate_max_length(max_length):
    """
    Retorna um validator que verifica tamanho máximo de string.
    Útil para prevenir DoS em queries.
    """
    def validator(value):
        if isinstance(value, str) and len(value) > max_length:
            raise serializers.ValidationError(f'Este campo não pode ter mais de {max_length} caracteres.')
        return value
    return validator
