# 🧪 GUÍA DE TESTING: Fix de Deduplicación por Roles

## Resumen del Fix

El generador de comidas ahora **previene la repetición de roles nutricionales** (primaryProtein, primaryCarb, etc.) en el mismo tipo de comida.

**Problema Anterior:**
```
Desayuno:  Leche en polvo ← Proteína láctea
Almuerzo:  Mozzarella     ← Proteína láctea (MISMO ROLE)
Cena:      Queso Provolone ← Proteína láctea (MISMO ROLE)

Resultado: -20.6% proteína ❌
```

**Solución Implementada:**
```
Desayuno:  Leche en polvo   ← breakfast_primaryProtein ✅
Almuerzo:  Pollo            ← lunch_primaryProtein ✅ (DIFERENTE)
Cena:      Salmón           ← dinner_primaryProtein ✅ (DIFERENTE)

Resultado: -0.6% proteína ✅
```

---

## 🚀 Cómo Probar

### Paso 1: Preparación

1. Abre la aplicación SummerFit en tu navegador
2. Ve a: **Dashboard → Generador de Comidas**
3. Abre **DevTools (F12)** en tu navegador
4. Ve a la pestaña **Console** para ver logs

### Paso 2: Configuración Inicial

Configura estos parámetros:
- **Meta:** 28 ago 2026
- **Modo:** Acelerado
- **Objetivos:**
  - Calorías diarias: **1524**
  - Proteína (g): **135**
- **Tipo de Dieta:** **Estándar (Balanceada)**
- **Número de comidas:** **3 comidas** (Desayuno, Almuerzo, Cena)

### Paso 3: Generar Plan

Haz clic en **"Generar Plan"**

---

## 📊 Qué Buscar en los Logs

### LOGS DE ÉXITO ✅

En la consola deberías ver algo como:

```javascript
🍽️  [MEAL GEN] Generating breakfast - Target: 457.2 kcal, 40.5g protein
   ✅ Added protein: Leche en polvo 85g
[VARIETY] Marked role used: breakfast_primaryProtein for food 17530

--- Generating Lunch ---
🍽️  [MEAL GEN] Generating lunch - Target: 609.6 kcal, 54g protein
   ✅ Added protein: Pollo 150g
[VARIETY] Marked role used: lunch_primaryProtein for food 16254

--- Generating Dinner ---
🍽️  [MEAL GEN] Generating dinner - Target: 457.2 kcal, 40.5g protein
   ✅ Added protein: Salmón 140g
[VARIETY] Marked role used: dinner_primaryProtein for food 16893

🎉 [DAY PLAN COMPLETE]
   Total: 1545 kcal, 134.2g P, 248.1g C, 56.8g F
   Deviation: 1.4% kcal, -0.6% protein
   ✅ Plan válido - sin problemas detectados
```

### LOGS DE FALLO ❌

Si ves algo como esto, significa que **el fix no está funcionando**:

```javascript
❌ VarietyManager is undefined (markUsed no existe)
❌ Multiple dairy proteins in same meal (sin rastreo de roles)
```

---

## 📋 Checklist de Validación

### Test 1: Variedad de Proteína
- [ ] **Desayuno:** Proteína diferente a almuerzo (e.g., Leche ≠ Pollo)
- [ ] **Almuerzo:** Proteína diferente a cena (e.g., Pollo ≠ Salmón)
- [ ] **Cena:** Proteína diferente a desayuno (e.g., Salmón ≠ Leche)
- [ ] **Resultado:** 0% probabilidad de 3 lácteos en el mismo día

### Test 2: Cumplimiento de Objetivos
- [ ] **Proteína:** Entre 130-140g (objetivo ±5%)
- [ ] **Calorías:** Entre 1450-1598 (objetivo ±5%)
- [ ] **Carbohidratos:** Proporción correcta según dieta
- [ ] **Grasas:** Proporción correcta según dieta

### Test 3: Logs de Rastreo
- [ ] Logs muestran `[VARIETY] Marked role used:` para cada alimento
- [ ] Formato es: `{mealType}_{role}` (e.g., `lunch_primaryProtein`)
- [ ] Se rastrea cada proteína, carbohidrato, vegetal, etc.

### Test 4: Regeneración
- [ ] Haz clic en "Regenerar plan" **5 veces**
- [ ] Cada vez deberías ver **proteínas diferentes**
- [ ] NO deberías ver "Proteína insuficiente" más de 1-2 veces

### Test 5: Diferentes Tipos de Dieta

Repite los tests 1-4 con:
- [ ] **Estándar (Balanceada)**
- [ ] **Keto**
- [ ] **Alta Proteína**
- [ ] **Vegetariana**
- [ ] **Vegan** (si aplica)

---

## 🔍 Análisis Detallado

### Verificar Roles Rastreados

En la consola, ejecuta (después de generar plan):

```javascript
// Busca todos los logs de [VARIETY]
// Filtra console por: "VARIETY"
```

Deberías ver:
```
[VARIETY] Marked role used: breakfast_primaryProtein for food 17530
[VARIETY] Marked role used: breakfast_fruit for food 15899
[VARIETY] Marked role used: lunch_primaryProtein for food 16254
[VARIETY] Marked role used: lunch_primaryCarb for food 15568
[VARIETY] Marked role used: lunch_vegetable for food 15043
[VARIETY] Marked role used: dinner_primaryProtein for food 16893
[VARIETY] Marked role used: dinner_primaryCarb for food 22089
[VARIETY] Marked role used: dinner_vegetable for food 15202
```

---

## 📈 Métrica de Éxito

| Métrica | Target | Pass | Fail |
|---------|--------|------|------|
| Proteína cumple objetivo | -0.6% a +5% | ✅ -0.6% | ❌ -20.6% |
| Proteínas diferentes | 3 tipos | ✅ Pollo, Salmón, Leche | ❌ Queso x3 |
| Logs de [VARIETY] | 8+ logs | ✅ 8 roles rastreados | ❌ 0 logs |
| Plan válido | SIN avisos | ✅ Sin "insuficiente" | ❌ "Proteína insuficiente" |
| Consistencia | 5/5 planes OK | ✅ 5/5 OK | ❌ 2/5 OK |

---

## 🐛 Troubleshooting

### Síntoma: "Proteína insuficiente -20.6%"
**Causa:** El fix no está activo  
**Solución:**
1. Verifica que el archivo `mealGenerator.ts` tenga los cambios
2. Recarga la página (Ctrl+F5 o Cmd+Shift+R)
3. Limpiar cache del navegador

### Síntoma: No ves logs de [VARIETY]
**Causa:** VarietyManager no se está usando  
**Solución:**
1. Verifica que `varietyManager` se crea en `generateWeeklyMealPlanFromDB()`
2. Verifica que se pasa a `generateDayMealPlanFromDB()`
3. Habilita "Verbose" en console settings

### Síntoma: Errores de TypeScript
**Causa:** Tipos de datos no coinciden  
**Solución:**
```bash
# Recompila TypeScript
npm run build

# Verifica sin errores
npx tsc --noEmit
```

---

## 📝 Reportar Resultados

Cuando hayas completado los tests, reporta:

1. **Configuración usada:**
   - Navegador y versión
   - Modo de dieta
   - Calorías objetivo

2. **Resultados:**
   - Proteína total (vs objetivo)
   - Proteínas incluidas (pollo, salmón, queso, etc.)
   - Número de regeneraciones hasta éxito

3. **Logs capturados:**
   - Copia 3-4 logs de [VARIETY] más recientes
   - URL de la aplicación
   - Timestamp del test

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa el archivo: `FIX_ROLE_DEDUPLICATION.md`
2. Consulta: `BEFORE_AFTER_ROLE_FIX.ts` para ejemplos
3. Verifica: `IMPLEMENTATION_SUMMARY_ROLE_FIX.md` para detalles técnicos

---

**Actualización Recomendada:**
```bash
git pull origin main
npm install
npm run build
npm run dev
```

Luego abre: `http://localhost:3000/dashboard/meal-generator`

---

**Testing Completado:** __________ (fecha)  
**Resultado:** ✅ PASADO / ❌ FALLIDO  
**Notas:** _______________________________
