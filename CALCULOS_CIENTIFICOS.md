# 📊 Cálculos Científicos de SummerFit

Este documento detalla todas las fórmulas matemáticas y científicas utilizadas en la aplicación.

## 🔬 Fórmulas Base

### 1. Tasa Metabólica Basal (BMR)
**Fórmula: Mifflin-St Jeor** (más precisa que Harris-Benedict)

**Hombres:**
```
BMR = 10 × peso(kg) + 6.25 × altura(cm) - 5 × edad(años) + 5
```

**Mujeres:**
```
BMR = 10 × peso(kg) + 6.25 × altura(cm) - 5 × edad(años) - 161
```

**Ejemplo:**
- Hombre, 75kg, 175cm, 28 años
- BMR = 10×75 + 6.25×175 - 5×28 + 5 = 1,708 kcal/día

### 2. Gasto Energético Total Diario (TDEE)
```
TDEE = BMR × Factor de Actividad
```

**Factores de Actividad:**
- Sedentario (poco o ningún ejercicio): 1.2
- Ligero (ejercicio 1-3 días/semana): 1.375
- Moderado (ejercicio 3-5 días/semana): 1.55
- Activo (ejercicio 6-7 días/semana): 1.725
- Muy activo (ejercicio intenso diario): 1.9

**Ejemplo:**
- BMR = 1,708 kcal
- Actividad Moderada (1.55)
- TDEE = 1,708 × 1.55 = 2,647 kcal/día

### 3. Índice de Masa Corporal (IMC)
```
IMC = peso(kg) / [altura(m)]²
```

**Clasificación OMS:**
- < 18.5: Bajo peso
- 18.5 - 24.9: Normal
- 25.0 - 29.9: Sobrepeso
- ≥ 30.0: Obesidad

**Ejemplo:**
- 75kg, 1.75m
- IMC = 75 / (1.75)² = 24.5 (Normal)

## 🎯 Cálculos de Objetivos

### 4. Déficit/Superávit Calórico

**Para Pérdida de Peso (Definir):**
```
Calorías Objetivo = TDEE × (1 - 0.15)  // Déficit 15%
```

**Para Mantenimiento:**
```
Calorías Objetivo = TDEE
```

**Para Ganancia de Peso (Volumen):**
```
Calorías Objetivo = TDEE × (1 + 0.10)  // Superávit 10%
```

**Límites de Seguridad:**
- Mínimo absoluto: 1,200 kcal/día
- Máximo déficit: 25% del TDEE
- Máximo superávit: 15% del TDEE

### 5. Proyección de Tiempo

**Principio Base:**
```
1 kg de grasa corporal ≈ 7,700 kcal
```

**Cálculo de Semanas:**
```
Semanas = |Peso Actual - Peso Objetivo| / Tasa Semanal
```

**Tasa Semanal Segura:**
- Acelerado: 1.0 kg/semana (máximo)
- Moderado: 0.6 kg/semana (recomendado)
- Conservador: 0.35 kg/semana (sostenible)

**Límite de Seguridad:**
```
Tasa Máxima = Peso Actual × 0.01  // 1% del peso corporal/semana
```

**Ejemplo:**
- Peso actual: 78kg
- Peso objetivo: 72kg
- Diferencia: 6kg
- Modo Moderado: 0.6 kg/semana
- Tiempo = 6 / 0.6 = 10 semanas ≈ 2.3 meses

### 6. Déficit Calórico Diario
```
Déficit Diario = (Tasa Semanal × 7,700) / 7 días
```

**Ejemplo:**
- Tasa: 0.6 kg/semana
- Déficit = (0.6 × 7,700) / 7 = 660 kcal/día

## 🍽️ Macronutrientes

### 7. Distribución Estándar

**Proteína:**
```
Proteína (g) = Peso(kg) × 2.0
```
- Rango científico: 1.8-2.2 g/kg
- Óptimo para preservar masa muscular en déficit

**Grasa:**
```
Grasa (g) = (Calorías Objetivo × 0.27) / 9
Mínimo = Peso(kg) × 0.8
```
- 27% de calorías totales (rango: 25-30%)
- Mínimo 0.8g/kg para función hormonal

**Carbohidratos:**
```
Carbohidratos (g) = [Calorías - (Proteína×4 + Grasa×9)] / 4
```
- Resto de calorías después de proteína y grasa

**Ejemplo (75kg, 2,250 kcal):**
- Proteína: 75 × 2.0 = 150g (600 kcal)
- Grasa: (2,250 × 0.27) / 9 = 67.5g (608 kcal)
- Carbohidratos: (2,250 - 1,208) / 4 = 260g (1,042 kcal)

### 8. Ajustes por Tipo de Dieta

**Keto:**
```
Carbohidratos: <50g o 0.5g/kg (el menor)
Proteína: Peso × 1.8
Grasa: Resto de calorías
```

**Vegana:**
```
Proteína: Peso × 2.2  // +10% por menor biodisponibilidad
Grasa: 25% calorías
Carbohidratos: Resto
```

**Vegetariana:**
```
Proteína: Peso × 2.0
Grasa: 28% calorías
Carbohidratos: Resto
```

**Paleo:**
```
Carbohidratos: Estándar × 0.75  // -25%
Proteína: Peso × 2.0
Grasa: Resto de calorías
```

**Mediterránea:**
```
Proteína: Peso × 1.8
Grasa: 33% calorías  // Grasas saludables
Carbohidratos: Resto
```

## ⚠️ Warnings y Validaciones

### 9. Sistema de Alertas

**Pérdida Muy Rápida:**
```
SI Tasa Semanal > Peso Actual × 0.01 ENTONCES
    Mostrar Warning: "Velocidad ajustada al 1% del peso corporal"
```

**Objetivo Extremo:**
```
SI |Peso Actual - Peso Objetivo| ≥ 15kg Y Modo = "Acelerado" ENTONCES
    Mostrar Warning: "Riesgo de pérdida muscular y efecto rebote"

SI |Peso Actual - Peso Objetivo| ≥ 20kg ENTONCES
    Mostrar Sugerencia: "Divide en metas intermedias de 5-10kg"
```

**Déficit Extremo:**
```
SI (TDEE - Calorías Objetivo) > TDEE × 0.25 ENTONCES
    Mostrar Warning: "Déficit muy alto, puede afectar metabolismo"
```

## 📈 Cálculo de Calorías Quemadas por Ejercicio

### 10. Estimación de Gasto Calórico

**Fórmula Aproximada:**
```
Calorías Quemadas = Minutos × Factor de Intensidad
```

**Factores por Tipo:**
- Cardio: 6 kcal/min
- Fuerza: 5 kcal/min
- HIIT: 9 kcal/min
- Movilidad: 3 kcal/min

**Ejemplo:**
- 45 minutos de HIIT
- Calorías = 45 × 9 = 405 kcal

**Nota:** Estos son valores aproximados. El gasto real depende de:
- Peso corporal
- Intensidad real del ejercicio
- Condición física individual
- Composición corporal

## 🔄 Adaptación Metabólica

### 11. Consideraciones Avanzadas

**Efecto Termogénico de los Alimentos (TEF):**
- Proteína: 20-30% de sus calorías
- Carbohidratos: 5-10%
- Grasas: 0-3%

**Adaptación Metabólica:**
- Después de 8-12 semanas en déficit, el metabolismo puede reducirse 5-10%
- Recomendación: "Diet breaks" cada 8-12 semanas (1-2 semanas en mantenimiento)

**Pérdida de Peso Real vs Grasa:**
```
Pérdida Total = Grasa + Agua + Glucógeno + (Músculo si déficit muy alto)
```

## 📚 Referencias Científicas

1. **Mifflin-St Jeor Equation**: Mifflin MD, et al. (1990). A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr.

2. **Protein Requirements**: Phillips SM, Van Loon LJ. (2011). Dietary protein for athletes: from requirements to optimum adaptation. J Sports Sci.

3. **Fat Requirements**: Helms ER, et al. (2014). Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr.

4. **Weight Loss Rate**: Hall KD, et al. (2011). Quantification of the effect of energy imbalance on bodyweight. Lancet.

5. **BMI Classification**: World Health Organization (2000). Obesity: preventing and managing the global epidemic.

## ⚖️ Disclaimer Legal

**IMPORTANTE:** Todos los cálculos son estimaciones basadas en fórmulas científicas validadas, pero:

- Los resultados individuales pueden variar
- Factores como genética, hormonas, medicamentos y condiciones médicas afectan los resultados
- Esta app NO sustituye el consejo médico profesional
- Consulta con un médico o nutricionista certificado antes de iniciar cualquier programa de pérdida/ganancia de peso
- Si tienes condiciones médicas preexistentes, embarazo, o tomas medicamentos, consulta a un profesional

---

**Última actualización:** Diciembre 2024
**Versión:** 2.0
