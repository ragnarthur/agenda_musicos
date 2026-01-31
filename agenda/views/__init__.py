# agenda/views/__init__.py
"""
Exports centralizados dos ViewSets.

Esta estrutura modular substitui o monolítico views.py (2.692 linhas).
"""

# ViewSets menores (já refatorados)
from .badges import BadgeViewSet
from .connections import ConnectionViewSet
from .instruments import InstrumentViewSet

# ViewSets médios (Phase 2)
from .availabilities import AvailabilityViewSet
from .leader_availabilities import LeaderAvailabilityViewSet
from .musicians import MusicianViewSet

# TODO: Refatorar ViewSets grandes do views.py antigo:
# from .events import EventViewSet

__all__ = [
    # ViewSets já modularizados
    "BadgeViewSet",
    "ConnectionViewSet",
    "InstrumentViewSet",
    # Phase 2 - ViewSets médios
    "AvailabilityViewSet",
    "LeaderAvailabilityViewSet",
    "MusicianViewSet",
    # TODO: Adicionar quando refatorados
    # "EventViewSet",
]
