# agenda/instrument_utils.py
"""
Utilitários relacionados a instrumentos.
Centraliza definições de labels para evitar duplicação.
"""

INSTRUMENT_LABELS = {
    "vocal": "Vocal",
    "guitar": "Guitarra",
    "acoustic_guitar": "Violão",
    "bass": "Baixo",
    "drums": "Bateria",
    "keyboard": "Teclado",
    "piano": "Piano",
    "synth": "Sintetizador",
    "percussion": "Percussão",
    "cajon": "Cajón",
    "violin": "Violino",
    "viola": "Viola",
    "cello": "Violoncelo",
    "double_bass": "Contrabaixo acústico",
    "saxophone": "Saxofone",
    "trumpet": "Trompete",
    "trombone": "Trombone",
    "flute": "Flauta",
    "clarinet": "Clarinete",
    "harmonica": "Gaita",
    "ukulele": "Ukulele",
    "banjo": "Banjo",
    "mandolin": "Bandolim",
    "dj": "DJ",
    "producer": "Produtor(a)",
    "other": "Outro",
}


def get_instrument_label(instrument_key: str) -> str:
    """
    Retorna label do instrumento com fallback.

    Args:
        instrument_key: Chave do instrumento

    Returns:
        str: Label do instrumento ou chave capitalizada se não encontrado
    """
    if not instrument_key:
        return "Sem instrumento"
    return INSTRUMENT_LABELS.get(instrument_key, instrument_key.capitalize())
