# agenda/views/__init__.py
"""
Exports centralizados dos ViewSets.

Esta estrutura modular substitui o monolítico views.py (2.692 linhas).
"""

# ViewSets menores (já refatorados)
from .badges import BadgeViewSet
from .connections import ConnectionViewSet
from .instruments import InstrumentViewSet

# TODO: Refatorar ViewSets maiores do views.py antigo:
# from .musicians import MusicianViewSet
# from .events import EventViewSet
# from .availabilities import AvailabilityViewSet, LeaderAvailabilityViewSet

__all__ = [
    # ViewSets já modularizados
    "BadgeViewSet",
    "ConnectionViewSet",
    "InstrumentViewSet",
    # TODO: Adicionar quando refatorados
    # "MusicianViewSet",
    # "EventViewSet",
    # "AvailabilityViewSet",
    # "LeaderAvailabilityViewSet",
]
