"""Compatibilidad para imports antiguos `components.*`.

Los módulos originales viven ahora bajo `app.components.*`, pero algunos
entornos todavía los referencian con la ruta anterior. Este paquete
reexporta los objetos públicos para evitar errores de importación sin
duplicar lógica.
"""

from .food_search import food_search
from .hero_section import render_hero
from .metric_card import metric_card
from .mode_selector import render_mode_selector
from .wizard_nav import wizard_nav

__all__ = [
    "food_search",
    "render_hero",
    "metric_card",
    "render_mode_selector",
    "wizard_nav",
]
