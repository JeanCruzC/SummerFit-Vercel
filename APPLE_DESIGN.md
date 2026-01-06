# 🍎 SummerFit - Diseño Apple/Fitia Premium

## ✨ Características del Nuevo Diseño

### 🎨 Identidad Visual

**Paleta de Colores:**
- **Light Mode**: Fondo #F8F8FA, Surface #FFFFFF, Acento #34C759 (verde fitness)
- **Dark Mode**: Fondo #000000, Surface #1C1C1E, Acento #30D158
- **90% neutros + 10% acento** para diseño limpio y profesional

**Tipografía:**
- Font: Inter (estilo SF Pro Display de Apple)
- Jerarquía clara: H1 30px, Section 18px, Body 15px, Caption 12.5px
- Métricas con `tabular-nums` para alineación perfecta

**Iconografía:**
- SVG outline consistente (stroke 1.75)
- Estilo minimalista y limpio

### 📱 Componentes Principales

#### 1. Hero Section - "Objetivo de hoy"
- Métrica grande de calorías objetivo
- 3 mini-cards: Consumidas, Restantes, Déficit
- Barra de progreso delgada (8px)
- Chips informativos: Plan, Déficit, Actividad

#### 2. KPIs (3 cards)
- **Peso actual**: Con delta desde inicio
- **Meta final**: Kg restantes
- **Fecha objetivo**: Semanas estimadas

#### 3. Macros de hoy
- 3 mini-cards para Proteína, Carbohidratos, Grasas
- Barras de progreso individuales
- Distribución sugerida

#### 4. Acciones rápidas
- 3 botones grandes estilo iOS
- Registrar comida (primary)
- Registrar peso (secondary)
- Entrenar (secondary)

### 🎯 Estilo de Componentes

**Cards:**
- Border radius: 16px
- Border: 1px sólido
- Shadow: 0 1px 2px rgba(0,0,0,0.06) (light) / sin sombra (dark)
- Padding: 24px

**Botones:**
- Height: 44px
- Border radius: 12px
- Primary: Verde fitness con hover brightness
- Secondary: Surface2 con border

**Inputs:**
- Height: 44px
- Border radius: 10px
- Focus ring: 2px primary suave

## 🚀 Cómo Usar

### Opción 1: Cambiar con Script

```bash
# Activar diseño Apple
./switch_design.sh apple

# Volver al diseño original
./switch_design.sh original
```

### Opción 2: Ejecutar Directamente

```bash
# Diseño Apple
streamlit run app/streamlit_app_apple.py

# Diseño original
streamlit run app/streamlit_app.py
```

## 📂 Archivos Nuevos

```
assets/
└── apple_style.css          # Estilos completos Apple/Fitia

app/
└── streamlit_app_apple.py   # App con diseño nuevo

switch_design.sh             # Script para cambiar diseños
APPLE_DESIGN.md             # Esta documentación
```

## 🎨 Diferencias Clave vs Diseño Anterior

| Aspecto | Anterior | Apple/Fitia |
|---------|----------|-------------|
| **Paleta** | Gradientes púrpura/azul | 90% neutros + verde fitness |
| **Tipografía** | Múltiples pesos | Jerarquía clara Inter |
| **Cards** | Glassmorphism fuerte | Bordes sutiles + sombra mínima |
| **Botones** | Gradientes | Sólidos con hover brightness |
| **Iconos** | Emojis | SVG outline consistente |
| **Espaciado** | Variable | Sistema 4/8/12/16/24px |
| **Contraste** | Medio-alto | Alto (WCAG AAA) |

## 🌓 Modo Oscuro

El diseño incluye soporte completo para modo oscuro:
- Fondo negro puro (#000000)
- Cards en #1C1C1E
- Sin sombras (estilo iOS)
- Acento verde más luminoso (#30D158)
- Texto blanco nítido

## 📱 Responsive

- Desktop: Layout completo con grid 12 columnas
- Tablet: Cards apiladas en 2 columnas
- Mobile: Stack vertical, botones full-width

## ✅ Checklist de Implementación

- [x] CSS base estilo Apple
- [x] Hero section con objetivo calórico
- [x] KPIs (Peso, Meta, Fecha)
- [x] Macros con mini-cards
- [x] Acciones rápidas
- [x] Tabs de navegación (5 secciones)
- [x] Gráfica de progreso semanal
- [x] Ring de adherencia SVG
- [x] Pantalla de onboarding (3 pasos)
- [x] Modo oscuro toggle funcional
- [x] Responsive design completo

## 🔄 Próximos Pasos

1. **Integrar autenticación** con el diseño nuevo
2. **Agregar tabs** (Resumen, Nutrición, Entrenar, Progreso, Perfil)
3. **Implementar gráficas** con estilo Apple
4. **Crear ring de adherencia** SVG
5. **Pantalla de onboarding** paso a paso
6. **Toggle modo oscuro** funcional
7. **Animaciones** con transiciones suaves

## 💡 Tips de Uso

- Los colores usan variables CSS `rgb(var(--primary))` para fácil theming
- Todos los componentes son responsive por defecto
- El diseño prioriza legibilidad y jerarquía visual
- Métricas usan `tabular-nums` para alineación perfecta

---

**Diseño inspirado en:** Apple Health, Fitia, iOS Design System  
**Versión:** 1.0  
**Fecha:** Diciembre 2024
