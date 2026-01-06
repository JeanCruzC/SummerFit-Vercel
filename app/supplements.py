"""Supplement recommendations based on goal and diet type."""
from __future__ import annotations

from typing import Dict, List


def recommend_supplements(goal: str, diet_type: str) -> List[Dict]:
    base_disclaimer = "⚠️ Suplementos sugeridos basados en déficits comunes. Consulta médico antes de consumir."
    catalog = {
        "Definir": [
            "Multivitamínico para prevenir deficiencias",
            "Omega-3 (antiinflamatorio)",
            "Vitamina D si hay poca exposición solar",
            "Proteína en polvo para alcanzar la meta diaria",
        ],
        "Volumen": [
            "Creatina monohidratada 5g/día",
            "Multivitamínico",
            "Proteína en polvo post-entreno",
        ],
        "Keto": [
            "Electrolitos (sodio, potasio, magnesio)",
            "Aceite MCT para energía rápida",
            "Omega-3",
        ],
        "Vegana": [
            "Vitamina B12 (crítico)",
            "Hierro + Vitamina C",
            "Omega-3 de algas",
            "Proteína vegetal en polvo",
        ],
        "Vegetariana": [
            "Omega-3 de algas",
            "Vitamina B12",
            "Proteína vegetal en polvo",
        ],
        "Mediterránea": ["Omega-3", "Vitamina D", "Multivitamínico suave"],
        "Paleo": ["Omega-3", "Magnesio", "Vitamina D"],
    }

    merged_key = diet_type if diet_type != "Estándar" else goal
    suggestions = catalog.get(merged_key, catalog.get(goal, catalog.get("Mediterránea")))
    if diet_type in catalog:
        # merge base goal + diet specific
        suggestions = list(dict.fromkeys(suggestions + catalog.get(goal, [])))

    return [{"label": s, "disclaimer": base_disclaimer} for s in suggestions]

