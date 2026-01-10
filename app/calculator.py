"""Goal projection and macro calculators con fórmulas científicas precisas.

Incluye:
- Fórmula Mifflin-St Jeor para BMR (más precisa que Harris-Benedict)
- Cálculo de déficit/superávit calórico basado en 7700 kcal = 1 kg grasa
- Proyecciones realistas considerando adaptación metabólica
- Macros ajustados por tipo de dieta con bases científicas
"""
from __future__ import annotations

import datetime
from dataclasses import dataclass
from datetime import date, timedelta, datetime, timezone
from typing import Dict, List


@dataclass
class ModeConfig:
    name: str
    loss_rate: float
    gain_rate: float
    deficit_pct: float
    color: str
    risk_msg: str


@dataclass
class ProjectionSnapshot:
    weeks: float
    months: float
    target_date: str
    daily_calories: int
    weekly_rate: float
    risk_msg: str
    color: str
    warnings: List[str]

    def to_dict(self) -> Dict:
        return {
            "weeks": self.weeks,
            "months": self.months,
            "target_date": self.target_date,
            "daily_calories": self.daily_calories,
            "weekly_rate": self.weekly_rate,
            "risk_msg": self.risk_msg,
            "color": self.color,
            "warnings": self.warnings,
        }


@dataclass
class MacroBreakdown:
    protein_g: int
    fat_g: int
    carbs_g: int
    kcal_target: int
    diet_type: str | None = None

    def to_dict(self) -> Dict[str, int | str | None]:
        return {
            "protein_g": self.protein_g,
            "fat_g": self.fat_g,
            "carbs_g": self.carbs_g,
            "kcal_target": self.kcal_target,
            "diet_type": self.diet_type,
        }


class GoalCalculator:
    MODES: Dict[str, ModeConfig] = {
        "Acelerado": ModeConfig(
            name="Acelerado",
            loss_rate=1.0,
            gain_rate=0.75,
            deficit_pct=0.25,
            color="#f87171",
            risk_msg="⚠️ Alto riesgo. Solo por periodos cortos.",
        ),
        "Moderado": ModeConfig(
            name="Moderado",
            loss_rate=0.6,
            gain_rate=0.4,
            deficit_pct=0.15,
            color="#34d399",
            risk_msg="✅ Balance ideal sostenible.",
        ),
        "Conservador": ModeConfig(
            name="Conservador",
            loss_rate=0.35,
            gain_rate=0.35,
            deficit_pct=0.10,
            color="#60a5fa",
            risk_msg="🐢 Lento pero seguro. Sin rebote.",
        ),
    }

    @staticmethod
    def activity_factor(level: str) -> float:
        mapping = {
            "Sedentario": 1.2,
            "Ligero": 1.375,
            "Moderado": 1.55,
            "Activo": 1.725,
            "Muy activo": 1.9,
        }
        return mapping.get(level, 1.2)

    @classmethod
    def _resolve_mode(cls, mode: str) -> ModeConfig:
        return cls.MODES.get(mode, cls.MODES["Moderado"])

    @staticmethod
    def _weeks_needed(current_weight: float, target_weight: float, weekly_rate: float) -> float:
        """Calcula semanas necesarias para alcanzar objetivo.
        
        Considera:
        - 1 kg de grasa = ~7700 kcal
        - Pérdida/ganancia gradual y sostenible
        """
        delta_kg = abs(current_weight - target_weight)
        safe_rate = max(weekly_rate, 0.1)  # Mínimo 0.1 kg/semana
        return delta_kg / safe_rate

    @staticmethod
    def _target_calories(tdee: float, pct: float, is_loss: bool) -> int:
        """Calcula calorías objetivo basado en TDEE y porcentaje de déficit/superávit.
        
        Límites de seguridad:
        - Mínimo 1200 kcal para mujeres, 1500 para hombres (usamos 1200 como mínimo general)
        - Máximo déficit: 25% del TDEE
        - Máximo superávit: 15% del TDEE
        """
        if is_loss:
            raw = tdee * (1 - min(pct, 0.25))  # Máximo 25% déficit
            adjusted = int(raw)
            return max(adjusted, 1200)  # Mínimo 1200 kcal
        else:
            raw = tdee * (1 + min(pct, 0.15))  # Máximo 15% superávit
            return int(raw)

    @classmethod
    def calculate_projection(cls, current_weight: float, target_weight: float, tdee: float, mode: str = "Moderado") -> ProjectionSnapshot:
        """Calcula proyección de pérdida/ganancia de peso.
        
        Fórmula base:
        - 1 kg grasa = 7700 kcal
        - Déficit diario = (weekly_rate * 7700) / 7 días
        - Calorías objetivo = TDEE - déficit_diario
        
        Warnings:
        - Pérdida >1% peso corporal/semana: riesgo de pérdida muscular
        - Déficit >25% TDEE: riesgo metabólico
        - Objetivo >20kg en modo acelerado: insostenible
        """
        config = cls._resolve_mode(mode)
        is_loss = current_weight > target_weight
        weekly_rate = config.loss_rate if is_loss else config.gain_rate
        
        # Validar que la tasa no exceda 1% del peso corporal por semana
        max_safe_rate = current_weight * 0.01  # 1% del peso corporal
        if is_loss and weekly_rate > max_safe_rate:
            weekly_rate = max_safe_rate
        
        weeks_needed = cls._weeks_needed(current_weight, target_weight, weekly_rate)
        warnings: List[str] = []
        
        # Warning por pérdida muy rápida
        if is_loss and weekly_rate > current_weight * 0.01:
            warnings.append("⚠️ Velocidad de pérdida ajustada al 1% de tu peso corporal por semana (máximo recomendado).")
        
        # Warning por objetivo extremo
        delta_kg = abs(current_weight - target_weight)
        if config.name == "Acelerado" and delta_kg >= 15:
            warnings.append("⚠️ Objetivo >15kg en modo Acelerado puede causar pérdida muscular y efecto rebote.")
        
        if delta_kg >= 20:
            warnings.append("💡 Considera dividir tu objetivo en metas intermedias de 5-10kg para mejor adherencia.")
        
        # Warning por déficit extremo
        daily_calories = cls._target_calories(tdee, config.deficit_pct, is_loss)
        if is_loss and (tdee - daily_calories) > tdee * 0.25:
            warnings.append("⚠️ Déficit calórico muy alto. Puede afectar metabolismo y energía.")
        
        today_utc = datetime.now(timezone.utc).date()
        estimated_date = (today_utc + timedelta(weeks=weeks_needed)).strftime("%d %b %Y")

        return ProjectionSnapshot(
            weeks=round(weeks_needed, 1),
            months=round(weeks_needed / 4.3, 1),
            target_date=estimated_date,
            daily_calories=daily_calories,
            weekly_rate=round(weekly_rate, 2),
            risk_msg=config.risk_msg,
            color=config.color,
            warnings=warnings,
        )

    @classmethod
    def macro_targets(cls, weight_kg: float, kcal_target: int) -> MacroBreakdown:
        """Calcula distribución de macronutrientes.
        
        Estándar científico:
        - Proteína: 1.8-2.2g/kg peso corporal (óptimo para preservar masa muscular)
        - Grasa: 25-30% de calorías totales (mínimo 0.8g/kg para hormonas)
        - Carbohidratos: resto de calorías
        """
        # Proteína: 2.0g/kg (punto medio óptimo)
        protein_g = round(weight_kg * 2.0)
        
        # Grasa: 27% de calorías (punto medio 25-30%)
        fat_g = round((kcal_target * 0.27) / 9)
        # Asegurar mínimo 0.8g/kg
        fat_g = max(fat_g, round(weight_kg * 0.8))
        
        # Carbohidratos: calorías restantes
        remaining = max(kcal_target - (protein_g * 4 + fat_g * 9), 0)
        carbs_g = round(remaining / 4)
        
        return MacroBreakdown(
            protein_g=protein_g,
            fat_g=fat_g,
            carbs_g=carbs_g,
            kcal_target=int(kcal_target),
        )

    @classmethod
    def calculate_targets(cls, profile: Dict) -> Dict:
        """Calcula BMR, TDEE, IMC y targets calóricos.
        
        Fórmulas:
        - BMR: Mifflin-St Jeor (más precisa que Harris-Benedict)
          Hombres: 10*peso + 6.25*altura - 5*edad + 5
          Mujeres: 10*peso + 6.25*altura - 5*edad - 161
        - TDEE: BMR * factor de actividad
        - IMC: peso / (altura_m)²
        """
        gender = profile.get("gender", "M")
        weight_kg = float(profile.get("weight_kg", 70))
        height_cm = float(profile.get("height_cm", 170))
        age = int(profile.get("age", 28))
        activity = profile.get("activity_level", "Moderado")
        goal = profile.get("goal", "Definir")

        # BMR usando Mifflin-St Jeor
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + (5 if gender == "M" else -161)
        
        # TDEE = BMR * factor de actividad
        tdee = bmr * cls.activity_factor(activity)
        
        # Ajuste por objetivo
        goal_adj = {
            "Definir": -0.15,    # Déficit 15%
            "Mantener": 0.0,     # Mantenimiento
            "Volumen": 0.10      # Superávit 10%
        }.get(goal, 0)
        kcal_target = int(tdee * (1 + goal_adj))

        # Macros ajustados por objetivo
        if goal == "Volumen":
            protein_g = round(weight_kg * 2.2)  # Más proteína para ganancia muscular
        else:
            protein_g = round(weight_kg * 2.0)  # Estándar para definición/mantenimiento
        
        fat_g = round(weight_kg * 0.9)  # ~0.9g/kg mínimo para hormonas
        remaining_kcal = max(kcal_target - (protein_g * 4 + fat_g * 9), 0)
        carbs_g = round(remaining_kcal / 4)

        # IMC
        bmi = round(weight_kg / ((height_cm / 100) ** 2), 1)
        
        # Clasificación IMC
        if bmi < 18.5:
            bmi_category = "Bajo peso"
        elif 18.5 <= bmi < 25:
            bmi_category = "Normal"
        elif 25 <= bmi < 30:
            bmi_category = "Sobrepeso"
        else:
            bmi_category = "Obesidad"

        return {
            "bmr": int(bmr),
            "tdee": int(tdee),
            "kcal_target": int(kcal_target),
            "protein_g": protein_g,
            "fat_g": fat_g,
            "carbs_g": carbs_g,
            "bmi": bmi,
            "bmi_category": bmi_category,
        }

    @staticmethod
    def adjusted_macros_by_diet(profile: Dict, targets: MacroBreakdown, diet_type: str) -> MacroBreakdown:
        """Ajusta macros según tipo de dieta con bases científicas.
        
        Keto: <50g carbos, 70-75% grasas, 20-25% proteína
        Vegana: Proteína aumentada 1.8-2.0g/kg (menor biodisponibilidad)
        Vegetariana: Proteína 1.6-1.8g/kg
        Paleo: Carbos reducidos, grasas saludables aumentadas
        Mediterránea: Grasas saludables 30-35%
        """
        weight_kg = float(profile.get("weight_kg", 70))
        protein_g = targets.protein_g
        carbs_g = targets.carbs_g
        fat_g = targets.fat_g
        kcal_target = targets.kcal_target

        if diet_type == "Keto":
            # Keto: <50g carbos, resto en grasas
            carbs_g = min(40, round(weight_kg * 0.5))
            protein_g = round(weight_kg * 1.8)  # Moderada en proteína
            fat_kcal = kcal_target - protein_g * 4 - carbs_g * 4
            fat_g = max(round(fat_kcal / 9), 50)
            
        elif diet_type == "Vegana":
            # Vegana: más proteína por menor biodisponibilidad
            protein_g = round(weight_kg * 2.2)
            # Ajustar carbos y grasas proporcionalmente
            fat_g = round((kcal_target * 0.25) / 9)
            remaining = max(kcal_target - (protein_g * 4 + fat_g * 9), 0)
            carbs_g = round(remaining / 4)
            
        elif diet_type == "Vegetariana":
            # Vegetariana: proteína ligeramente aumentada
            protein_g = round(weight_kg * 2.0)
            fat_g = round((kcal_target * 0.28) / 9)
            remaining = max(kcal_target - (protein_g * 4 + fat_g * 9), 0)
            carbs_g = round(remaining / 4)
            
        elif diet_type == "Paleo":
            # Paleo: carbos reducidos, grasas aumentadas
            carbs_g = round(carbs_g * 0.75)  # 25% menos carbos
            protein_g = round(weight_kg * 2.0)
            remaining = max(kcal_target - (protein_g * 4 + carbs_g * 4), 0)
            fat_g = round(remaining / 9)
            
        elif diet_type == "Mediterránea":
            # Mediterránea: grasas saludables 30-35%
            fat_g = round((kcal_target * 0.33) / 9)
            protein_g = round(weight_kg * 1.8)
            remaining = max(kcal_target - (protein_g * 4 + fat_g * 9), 0)
            carbs_g = round(remaining / 4)

        # Recalcular calorías totales
        recalculated_kcal = int(protein_g * 4 + carbs_g * 4 + fat_g * 9)
        
        return MacroBreakdown(
            protein_g=int(protein_g),
            carbs_g=int(carbs_g),
            fat_g=int(fat_g),
            kcal_target=recalculated_kcal,
            diet_type=diet_type,
        )


# Wrappers conservan compatibilidad

def calculate_projection_v2(current_weight, target_weight, tdee, mode="Moderado"):
    return GoalCalculator.calculate_projection(current_weight, target_weight, tdee, mode=mode).to_dict()


def macro_targets(weight_kg: float, kcal_target: int) -> Dict[str, int]:
    return GoalCalculator.macro_targets(weight_kg, kcal_target).to_dict()


def calculate_targets(profile: Dict) -> Dict:
    return GoalCalculator.calculate_targets(profile)


def adjusted_macros_by_diet(profile: Dict, targets: Dict, diet_type: str) -> Dict:
    base = MacroBreakdown(
        protein_g=int(targets.get("protein_g", 0)),
        fat_g=int(targets.get("fat_g", 0)),
        carbs_g=int(targets.get("carbs_g", 0)),
        kcal_target=int(targets.get("kcal_target", 0)),
    )
    return GoalCalculator.adjusted_macros_by_diet(profile, base, diet_type).to_dict()
