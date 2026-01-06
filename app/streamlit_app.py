from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Dict, List

import pandas as pd
import streamlit as st

from app.auth import AuthResult, AuthService
from app.calculator import GoalCalculator, adjusted_macros_by_diet, calculate_projection_v2, calculate_targets, macro_targets
from app.charts_premium import adherence_heatmap, calorie_ring, macro_bars, weight_trend
from app.components.food_search import food_search
from app.daily_tracker import DailyTracker
from app.food_repository import read_foods
from app.recipe_generator import generate_recipe_options
from app.supplements import recommend_supplements
from app.config import get_streamlit_cache_ttl
from app.components.mode_selector import render_mode_selector

st.set_page_config(
    page_title="SummerFit · Premium Fitness",
    page_icon="🏝️",
    layout="wide",
    initial_sidebar_state="collapsed",
)


def load_styles() -> None:
    css_path = Path(__file__).parent.parent / "assets" / "premium_styles.css"
    if css_path.exists():
        st.markdown(f"<style>{css_path.read_text()}</style>", unsafe_allow_html=True)


def ensure_foods_df(foods: List[Dict]) -> pd.DataFrame:
    df = pd.DataFrame(foods or [])
    if df.empty:
        sample_path = Path(__file__).parent.parent / "data" / "sample_foods.json"
        df = pd.read_json(sample_path)
    rename_map = {
        "kcal": "kcal_per_100g",
        "calories": "kcal_per_100g",
        "protein": "protein_g_per_100g",
        "carbs": "carbs_g_per_100g",
        "fat": "fat_g_per_100g",
    }
    for source, target in rename_map.items():
        if source in df.columns and target not in df.columns:
            df[target] = df[source]
    return df.fillna(0)


@st.cache_data(ttl=get_streamlit_cache_ttl())
def load_foods():
    try:
        foods = read_foods()
        if foods:
            return foods
    except Exception:
        pass
    sample_path = Path(__file__).parent.parent / "data" / "sample_foods.json"
    return pd.read_json(sample_path).to_dict(orient="records")


def auth_gate(auth: AuthService) -> AuthResult | None:
    st.markdown(
        """
        <div style="text-align:center;margin:2rem 0 1rem 0;">
            <h1 style="font-size:2.5rem;font-weight:800;background:linear-gradient(135deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:0.5rem;">
                🏝️ SummerFit
            </h1>
            <p style="color:#cbd5e1;font-size:1rem;font-weight:500;margin-bottom:2rem;">Accede a tu cockpit personal</p>
        </div>
        """,
        unsafe_allow_html=True
    )
    tab_login, tab_register = st.tabs(["Iniciar sesión", "Crear cuenta"])
    user: AuthResult | None = None
    with tab_login:
        with st.form("login-form"):
            email = st.text_input("Email", key="login-email")
            password = st.text_input("Contraseña", type="password", key="login-password")
            submit = st.form_submit_button("Entrar", use_container_width=True)
        if submit and email and password:
            user = auth.sign_in(email, password)
            if not user:
                st.error("No pudimos iniciar sesión. Verifica tus credenciales.")
    with tab_register:
        with st.form("register-form"):
            email_r = st.text_input("Email", key="register-email")
            password_r = st.text_input("Contraseña", type="password", key="register-password")
            submit_r = st.form_submit_button("Crear cuenta", use_container_width=True)
        if submit_r and email_r and password_r:
            user = auth.sign_up(email_r, password_r)
            if not user:
                st.error("No pudimos crear la cuenta. Intenta de nuevo.")
    if st.button("Explorar en modo demo", type="secondary"):
        user = AuthResult(user_id="demo-user", email="demo@sumerfit.app", demo_mode=True)

    return user


def render_profile(auth: AuthService, user: AuthResult) -> Dict:
    profile = st.session_state.get("profile_cache") or auth.get_profile(user.user_id)
    st.session_state["profile_cache"] = profile
    with st.expander("Perfil y objetivos", expanded=True):
        with st.form("profile-form"):
            c1, c2, c3 = st.columns(3)
            profile["gender"] = c1.selectbox("Género", ["M", "F"], index=["M", "F"].index(profile.get("gender", "M")))
            profile["age"] = c1.slider("Edad", min_value=14, max_value=90, value=int(profile.get("age", 28)))
            profile["height_cm"] = c2.number_input("Altura (cm)", min_value=120, max_value=220, value=int(profile.get("height_cm", 175)))
            profile["weight_kg"] = c2.number_input("Peso actual (kg)", min_value=35.0, max_value=220.0, value=float(profile.get("weight_kg", 78.0)), step=0.1)
            profile["target_weight_kg"] = c3.number_input(
                "Peso objetivo (kg)", min_value=35.0, max_value=220.0, value=float(profile.get("target_weight_kg", 72.0)), step=0.1
            )
            profile["activity_level"] = c3.selectbox(
                "Actividad diaria", ["Sedentario", "Ligero", "Moderado", "Activo", "Muy activo"], index=["Sedentario", "Ligero", "Moderado", "Activo", "Muy activo"].index(profile.get("activity_level", "Moderado"))
            )
            profile["goal"] = c1.selectbox("Objetivo", ["Definir", "Mantener", "Volumen"], index=["Definir", "Mantener", "Volumen"].index(profile.get("goal", "Definir")))
            profile["diet_type"] = c3.selectbox(
                "Tipo de dieta",
                ["Estándar", "Keto", "Vegana", "Vegetariana", "Paleo", "Mediterránea"],
                index=["Estándar", "Keto", "Vegana", "Vegetariana", "Paleo", "Mediterránea"].index(profile.get("diet_type", "Estándar")),
            )
            if st.form_submit_button("Guardar perfil", use_container_width=True):
                auth.upsert_profile(user.user_id, profile)
                st.session_state["profile_cache"] = profile
                st.success("Perfil actualizado")
    return profile


def render_hero_cards(weight: float, target: float, calories_target: int, delta: float):
    trend_color = "#34d399" if delta <= 0 else "#f87171"
    trend_icon = "▼" if delta <= 0 else "▲"
    st.markdown(
        f"""
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
    <div class="premium-card">
        <div class="metric-label">Peso Actual</div>
        <div class="metric-value">{weight:.1f} kg</div>
        <div style="color: {trend_color}; margin-top: 8px; font-weight: 700; font-size: 1rem;">{trend_icon} {abs(delta):.1f} kg desde inicio</div>
    </div>
    <div class="premium-card">
        <div class="metric-label">Meta Final</div>
        <div class="metric-value">{target:.1f} kg</div>
        <div style="color: #a5b4fc; margin-top: 8px; font-weight: 700; font-size: 1rem;">Faltan {abs(weight-target):.1f} kg</div>
    </div>
    <div class="premium-card">
        <div class="metric-label">Calorías Hoy</div>
        <div class="metric-value">{calories_target}</div>
        <div style="color: #e2e8f0; margin-top: 8px; font-size: 0.95rem;">kcal diarias</div>
    </div>
</div>
""",
        unsafe_allow_html=True,
    )


def render_projection_cards(projection: Dict):
    st.markdown(
        f"""
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px,1fr));gap:1.25rem;margin-top:1.5rem;">
            <div class="premium-card">
                <div class="metric-label">Velocidad semanal</div>
                <div class="metric-value">{projection['weekly_rate']} kg/sem</div>
                <div style="color:{projection['color']};font-size:1rem;font-weight:700;margin-top:8px;">{projection['risk_msg']}</div>
            </div>
            <div class="premium-card">
                <div class="metric-label">Semanas estimadas</div>
                <div class="metric-value">{projection['weeks']} sem</div>
                <div style="color:#e2e8f0;font-size:1rem;font-weight:600;margin-top:8px;">≈ {projection['months']} meses</div>
            </div>
            <div class="premium-card">
                <div class="metric-label">Fecha objetivo</div>
                <div class="metric-value" style="font-size:2rem;">{projection['target_date']}</div>
                <div style="color:#e2e8f0;font-size:1rem;font-weight:600;margin-top:8px;">Proyección realista</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_dashboard(profile: Dict, targets: Dict, projection: Dict, macros: Dict, tracker: DailyTracker, user: AuthResult):
    start_weight = st.session_state.get("start_weight", profile["weight_kg"])
    delta = profile["weight_kg"] - start_weight
    render_hero_cards(profile["weight_kg"], profile["target_weight_kg"], projection["daily_calories"], delta)
    
    # Mostrar IMC y categoría
    bmi = targets.get("bmi", 0)
    bmi_category = targets.get("bmi_category", "")
    bmi_color = {
        "Bajo peso": "#fbbf24",
        "Normal": "#34d399",
        "Sobrepeso": "#fb923c",
        "Obesidad": "#f87171"
    }.get(bmi_category, "#94a3b8")
    
    st.markdown(
        f"""
        <div class="premium-card" style="margin-bottom:1.5rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
                <div style="flex:1;min-width:200px;">
                    <div class="metric-label">Índice de Masa Corporal (IMC)</div>
                    <div style="font-size:2.5rem;font-weight:800;color:{bmi_color};margin:8px 0;">{bmi}</div>
                    <div style="color:#f1f5f9;font-size:1rem;font-weight:600;">Categoría: <strong style="color:{bmi_color};">{bmi_category}</strong></div>
                </div>
                <div style="flex:1;min-width:200px;text-align:right;">
                    <div class="metric-label">Tasa Metabólica Basal</div>
                    <div style="font-size:2.2rem;font-weight:800;color:#a5b4fc;margin:8px 0;">{targets['bmr']} kcal</div>
                    <div style="color:#e2e8f0;font-size:0.95rem;font-weight:600;">TDEE: {targets['tdee']} kcal/día</div>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )
    
    render_projection_cards(projection)
    for warning in projection.get("warnings", []):
        st.markdown(f"<div class='warning-card' style='margin-top:1rem;'>⚠️ {warning}</div>", unsafe_allow_html=True)

    st.markdown("### Macros y energía diarios")
    macro_values = {"Proteína": macros["protein_g"], "Carbohidratos": macros["carbs_g"], "Grasas": macros["fat_g"]}
    macro_cols = st.columns(3)
    macro_cols[0].markdown(
        f"<div class='premium-card'><div class='metric-label'>Proteína</div><div class='metric-value'>{macro_values['Proteína']} g</div></div>", 
        unsafe_allow_html=True
    )
    macro_cols[1].markdown(
        f"<div class='premium-card'><div class='metric-label'>Carbohidratos</div><div class='metric-value'>{macro_values['Carbohidratos']} g</div></div>", 
        unsafe_allow_html=True
    )
    macro_cols[2].markdown(
        f"<div class='premium-card'><div class='metric-label'>Grasas</div><div class='metric-value'>{macro_values['Grasas']} g</div></div>", 
        unsafe_allow_html=True
    )

    logs = tracker.list_logs(user.user_id, limit=30)
    weights = [log.get("weight_kg") for log in logs if log.get("weight_kg")]
    dates = [log.get("log_date") for log in logs if log.get("weight_kg")]
    if dates and isinstance(dates[0], str):
        dates = [pd.to_datetime(d).date() for d in dates]

    col1, col2 = st.columns([2, 1])
    if weights and dates:
        col1.plotly_chart(weight_trend(list(reversed(dates)), list(reversed(weights)), target_rate=projection["weekly_rate"]), use_container_width=True)
    adherence_pct, total_days = tracker.adherence(logs, projection["daily_calories"])
    consumed_proxy = projection["daily_calories"] * (adherence_pct / 100)
    col2.plotly_chart(calorie_ring(consumed_proxy, projection["daily_calories"]), use_container_width=True)
    col2.plotly_chart(macro_bars(macro_values), use_container_width=True)
    col2.markdown(
        f"<div class='premium-card'><div class='metric-label'>Adherencia</div><div class='metric-value'>{adherence_pct:.0f}%</div><div style='color:#e2e8f0;font-size:1rem;font-weight:600;margin-top:8px;'>Sobre {total_days} días medidos</div></div>", 
        unsafe_allow_html=True
    )


def section_recipes(foods_df: pd.DataFrame, adjusted_macros: Dict, tracker: DailyTracker, user: AuthResult):
    st.markdown("### 🍽️ Recetas inteligentes")
    c1, c2, c3, c4 = st.columns(4)
    calorie_target = c1.number_input("Calorías de la comida", value=int(adjusted_macros["kcal_target"] / 3), step=25)
    protein_target = c2.number_input("Proteína (g)", value=int(adjusted_macros["protein_g"] / 3), step=5)
    carb_target = c3.number_input("Carbos (g)", value=int(adjusted_macros["carbs_g"] / 3), step=5)
    fat_target = c4.number_input("Grasas (g)", value=int(adjusted_macros["fat_g"] / 3), step=2)
    if st.button("🔍 Generar opciones", use_container_width=True):
        st.session_state["recipe_options"] = generate_recipe_options(
            foods_df, calorie_target, protein_target, carb_target, fat_target, adjusted_macros["diet_type"]
        )
    options = st.session_state.get("recipe_options", [])
    if options:
        for idx, option in enumerate(options, start=1):
            totals = option["totals"]
            st.markdown(
                f"""
                <div class="premium-card" style="margin-bottom: 1rem;">
                    <div class="metric-label">✨ Opción {idx}</div>
                    <div style="color:#f1f5f9;font-weight:700;margin-top:6px;font-size:1rem;">Dieta: {option.get('diet_type','Estándar')}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            for item in option["items"]:
                st.markdown(f"- {item.get('icon','🍽️')} **{item.get('grams',0)}g** {item.get('name','Alimento')}")
            st.markdown(
                f"**✅ {totals['kcal']} kcal** | {totals['protein_g']}g 💪 {totals['carbs_g']}g 🍞 {totals['fat_g']}g 🥑"
            )
            if st.button("Agregar a mi registro diario", key=f"add-{idx}"):
                tracker.add_meal_entry(
                    user.user_id,
                    date.today(),
                    "Almuerzo",
                    f"Opción {idx}",
                    1,
                    {"kcal": totals["kcal"], "protein_g": totals["protein_g"], "carbs_g": totals["carbs_g"], "fat_g": totals["fat_g"]},
                )
                st.success("Receta agregada a tu día.")


def section_my_day(foods_df: pd.DataFrame, tracker: DailyTracker, targets: Dict, user: AuthResult):
    st.markdown("### 📝 Diario")
    today = date.today()
    entries = tracker.list_meal_entries(user.user_id, today)
    summary = tracker.day_summary(entries)
    with st.form("daily-log"):
        weight_today = st.number_input("Peso hoy (kg)", value=float(targets.get("weight_kg", summary.get("weight_kg", 0)) or 0), step=0.1)
        calories = st.number_input("Calorías consumidas", value=int(summary["kcal"] or targets["kcal_target"]), step=25)
        protein = st.number_input("Proteína total", value=float(summary["protein_g"] or targets["protein_g"]), step=5.0)
        carbs = st.number_input("Carbos totales", value=float(summary["carbs_g"] or targets["carbs_g"]), step=5.0)
        fats = st.number_input("Grasas totales", value=float(summary["fat_g"] or targets["fat_g"]), step=2.0)
        exercise_type = st.selectbox("Tipo de ejercicio", ["Cardio", "Fuerza", "HIIT", "Movilidad"])
        exercise_minutes = st.slider("Minutos", min_value=0, max_value=180, value=45, step=5)
        burned = int(exercise_minutes * (9 if exercise_type == "HIIT" else 6))
        submitted = st.form_submit_button("Guardar registro", use_container_width=True)
    if submitted:
        tracker.upsert_log(
            user.user_id,
            {
                "log_date": today.isoformat(),
                "weight_kg": weight_today,
                "calories_consumed": calories,
                "protein_g": protein,
                "carbs_g": carbs,
                "fat_g": fats,
                "exercise_minutes": exercise_minutes,
                "calories_burned": burned,
            },
        )
        st.success("Registro guardado.")
    st.plotly_chart(calorie_ring(summary["kcal"], targets["kcal_target"]), use_container_width=True)
    st.plotly_chart(
        macro_bars({"Proteína": summary["protein_g"], "Carbohidratos": summary["carbs_g"], "Grasas": summary["fat_g"]}),
        use_container_width=True,
    )

    st.markdown("#### Agregar alimento al día")
    selected_name = food_search(foods_df, key="food-search-day")
    grams = st.slider("Gramos", min_value=20, max_value=400, value=150, step=10)
    meal_type = st.selectbox("Comida", ["Desayuno", "Almuerzo", "Cena", "Snack"], key="meal-type")
    if st.button("Agregar alimento", use_container_width=True):
        food_row = foods_df[foods_df["name"].str.lower() == selected_name.lower()].head(1) if selected_name else pd.DataFrame()
        if not food_row.empty:
            row = food_row.iloc[0]
            macros = {
                "kcal": round((row.get("kcal_per_100g", 0) or 0) * grams / 100, 1),
                "protein_g": round((row.get("protein_g_per_100g", 0) or 0) * grams / 100, 1),
                "carbs_g": round((row.get("carbs_g_per_100g", 0) or 0) * grams / 100, 1),
                "fat_g": round((row.get("fat_g_per_100g", 0) or 0) * grams / 100, 1),
            }
            tracker.add_meal_entry(user.user_id, today, meal_type, selected_name, grams, macros)
            st.success("Alimento registrado.")
        else:
            st.warning("Selecciona un alimento válido con el buscador.")

    if entries:
        st.markdown("##### Registro del día")
        for e in entries:
            st.markdown(f"- {e.get('meal_type')} · {e.get('food_name')} · {e.get('grams')}g")


def section_supplements(profile: Dict):
    st.markdown("### Recomendador de suplementos")
    suggestions = recommend_supplements(profile["goal"], profile["diet_type"])
    for suggestion in suggestions:
        st.markdown(f"- 💊 {suggestion['label']}")
    st.caption(suggestions[0]["disclaimer"] if suggestions else "Consulta médico antes de consumir suplementos.")


def main():
    load_styles()
    auth = AuthService()
    tracker = DailyTracker(auth.client, demo_mode=auth.demo_mode)
    foods_df = ensure_foods_df(load_foods())

    if "user" not in st.session_state:
        st.session_state.user = None
    if st.session_state.user is None:
        user = auth_gate(auth)
        if not user:
            st.stop()
        st.session_state.user = user
    user: AuthResult = st.session_state.user
    if st.session_state.get("current_user_id") != user.user_id:
        st.session_state["current_user_id"] = user.user_id
        st.session_state["profile_cache"] = None
        st.session_state["start_weight"] = None

    profile = render_profile(auth, user)
    if st.session_state.get("start_weight") is None:
        st.session_state["start_weight"] = profile["weight_kg"]
    targets = calculate_targets(profile)
    current_mode = st.session_state.get("mode_selection", "Moderado")
    projection_snapshot = calculate_projection_v2(profile["weight_kg"], profile["target_weight_kg"], targets["tdee"], mode=current_mode)
    macros_snapshot = adjusted_macros_by_diet(
        profile,
        macro_targets(profile["weight_kg"], projection_snapshot["daily_calories"]),
        profile.get("diet_type", "Estándar"),
    )

    tab_dashboard, tab_diary, tab_recipes, tab_config = st.tabs(
        ["🏠 Dashboard", "📝 Diario", "🍽️ Recetas", "⚙️ Config"]
    )
    with tab_dashboard:
        st.markdown(
            """
            <div style="text-align:center;margin:2rem 0;">
                <h1 style="font-size:3rem;font-weight:800;background:linear-gradient(135deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:0.5rem;">
                    🏝️ SummerFit
                </h1>
                <p style="color:#cbd5e1;font-size:1.1rem;font-weight:500;">Experiencia Premium de Fitness</p>
            </div>
            """,
            unsafe_allow_html=True
        )
        selected_mode = render_mode_selector(default=current_mode)
        projection = calculate_projection_v2(profile["weight_kg"], profile["target_weight_kg"], targets["tdee"], mode=selected_mode)
        base_macros = macro_targets(profile["weight_kg"], projection["daily_calories"])
        adjusted_macros = adjusted_macros_by_diet(profile, base_macros, profile.get("diet_type", "Estándar"))
        render_dashboard(profile, targets, projection, adjusted_macros, tracker, user)
    with tab_diary:
        section_my_day(foods_df, tracker, {**targets, **macros_snapshot, "weight_kg": profile["weight_kg"]}, user)
    with tab_recipes:
        section_recipes(foods_df, macros_snapshot, tracker, user)
    with tab_config:
        st.markdown(
            "<h3 style='color:#f1f5f9;font-weight:700;margin-bottom:1rem;'>⚙️ Perfil y configuración</h3>",
            unsafe_allow_html=True
        )
        # No volver a renderizar el perfil aquí, ya se renderizó arriba
        st.markdown(
            "<h3 style='color:#f1f5f9;font-weight:700;margin:2rem 0 1rem 0;'>💡 Suplementos inteligentes</h3>",
            unsafe_allow_html=True
        )
        section_supplements(profile)

    st.markdown(
        "<div style='color:#94a3b8;margin-top:3rem;text-align:center;padding:1.5rem;font-size:0.9rem;'>🏗️ Arquitectura: 1 request a API externa → Supabase cacheada · Diseño premium responsive<br><br>ℹ️ Esta app es solo informativa. Consulta a un profesional médico antes de hacer cambios en tu dieta o ejercicio.</div>",
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
