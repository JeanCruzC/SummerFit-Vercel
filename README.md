---
title: "SummerFit · Premium Fitness Dashboard"
emoji: "💪"
colorFrom: "pink"
colorTo: "purple"
sdk: "streamlit"
sdk_version: "1.36.0"
app_file: "app/streamlit_app.py"
pinned: false
---

# SummerFit · Premium Fitness Dashboard

Rediseño completo inspirado en el estilo Linear/Vercel con nuevas funcionalidades críticas: autenticación Supabase, calculadora de proyección de objetivos, generador de recetas, registro diario y recomendador de suplementos.

## 🧭 Stack y arquitectura
- **Python 3.11 + Streamlit 1.36.0**
- **Supabase** para auth y persistencia de perfiles/logs.
- **Plotly** para gráficas premium.
- **Docker** listo para Hugging Face Spaces u otros despliegues containerizados.
- 1 request a API externa → cache en Supabase → consumo desde Streamlit.

## ⚡ Nuevo frontend Vercel (Next.js)
- **Ubicación**: `web/`
- **Stack**: Next.js 14 (App Router) + React 18 + Tailwind + Lucide Icons
- **Ejecutar en local**:
  ```bash
  cd web
  npm install
  npm run dev
  ```
- **Despliegue en Vercel**: selecciona `web` como Root Directory en el proyecto.

## 🚀 Puesta en marcha
1. Clona el repo y crea tu entorno.
2. Variables de entorno (`.env`):
   ```env
   SUPABASE_URL=https://guokspyuzpvzsobhfbvx.supabase.co
   SUPABASE_KEY=sb_publishable_qOR34CoTXiSWAfAQqVocCw_XhyCNA1R
   STREAMLIT_CACHE_TTL_SECONDS=86400
   ```
3. Instala dependencias y ejecuta:
   ```bash
   pip install -r requirements.txt
   streamlit run app/streamlit_app.py
   ```

## 🗄️ Esquema Supabase
Ejecuta `scripts/setup_supabase_schema.sql` en el editor SQL de Supabase para crear usuarios, perfiles, logs diarios, comidas y catálogo de alimentos (incluye índices de performance).

## 🧩 Funcionalidades clave
- **UI premium**: glassmorphism, gradientes sutiles, cards con sombras, responsive mobile.
- **Autenticación Supabase**: login/register simple (fallback demo si no hay credenciales).
- **Perfil persistente**: género, edad, altura, peso actual/objetivo, actividad y dieta.
- **Calculadora de proyección**: fecha estimada, velocidad saludable, warnings y disclaimer legal.
- **Dashboard**: hero impactante, métricas, gauge de avance, macros por dieta, gráficas de peso y adherencia.
- **Registro diario (Mi día)**: peso, calorías, macros, ejercicio, buscador de alimentos con autocomplete y guardado en Supabase o modo demo.
- **Generador de recetas**: combina alimentos según calorías/macros/dieta y permite agregarlos al registro.
- **Suplementos**: sugerencias según objetivo/dieta con disclaimers.

## 🐳 Docker
```bash
docker build -t summerfit-app .
docker run -it --rm -p 7860:7860 -e PORT=7860 summerfit-app
```

## 📂 Estructura
```
app/
├── streamlit_app.py        # UI premium + navegación
├── auth.py                 # Login/Register Supabase + perfiles
├── calculator.py           # Proyecciones y ajustes por dieta
├── recipe_generator.py     # Generador de recetas/macro combos
├── supplements.py          # Recomendador de suplementos
├── daily_tracker.py        # CRUD de logs diarios
├── charts_premium.py       # Gráficas Plotly estilizadas
└── components/             # Hero, cards, buscador
assets/
├── premium_styles.css      # Estilos premium (Linear/Vercel)
└── icons/                  # SVG Lucide/Heroicons
scripts/
└── setup_supabase_schema.sql
```

## ✅ Tips
- Usa `STREAMLIT_CACHE_TTL_SECONDS` para cachear el fetch desde Supabase.
- El modo demo permite probar sin credenciales; Supabase se usa automáticamente si las env vars están presentes.
- Ajusta `requirements.txt` y `Dockerfile` si agregas dependencias extra.
