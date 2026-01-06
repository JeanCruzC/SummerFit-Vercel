from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List

import pandas as pd
import streamlit as st
import plotly.graph_objects as go

from app.auth import AuthResult, AuthService
from app.calculator import calculate_projection_v2, calculate_targets, macro_targets, adjusted_macros_by_diet
from app.daily_tracker import DailyTracker
from app.food_repository import read_foods

st.set_page_config(
    page_title="SummerFit",
    page_icon="🏃",
    layout="wide",
    initial_sidebar_state="collapsed",
)


def load_apple_styles():
    """Carga estilos Apple/Fitia premium"""
    css_path = Path(__file__).parent.parent / "assets" / "apple_style.css"
    if css_path.exists():
        st.markdown(f"<style>{css_path.read_text()}</style>", unsafe_allow_html=True)
    
    # Aplicar tema
    theme = st.session_state.get('theme', 'light')
    if theme == 'dark':
        st.markdown('<div data-theme="dark" style="min-height:100vh;">', unsafe_allow_html=True)


def render_hero_section(profile: Dict, projection: Dict):
    """Hero: Objetivo de hoy"""
    st.markdown(
        f"""
        <div class="apple-card">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">
                <div>
                    <h2 style="margin:0;">Objetivo de hoy</h2>
                    <div class="subtitle" style="margin-top:4px;">Calorías restantes · Basado en tu plan Moderado</div>
                </div>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr;gap:20px;">
                <div>
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                        <div class="icon-badge">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--primary))" stroke-width="1.75">
                                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                            </svg>
                        </div>
                        <div>
                            <div class="caption">Objetivo</div>
                            <div class="metric-large">{projection['daily_calories']} <span style="font-size:18px;font-weight:500;color:rgb(var(--text2));">kcal</span></div>
                        </div>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
                        <div class="mini-card">
                            <div class="caption">Consumidas</div>
                            <div class="metric-small">0</div>
                        </div>
                        <div class="mini-card">
                            <div class="caption">Restantes</div>
                            <div class="metric-small">{projection['daily_calories']}</div>
                        </div>
                        <div class="mini-card">
                            <div class="caption">Déficit</div>
                            <div class="metric-small">-450</div>
                        </div>
                    </div>
                    
                    <div style="height:8px;background:rgb(var(--surface2));border:1px solid rgb(var(--border));border-radius:999px;overflow:hidden;margin-bottom:12px;">
                        <div style="height:100%;width:0%;background:rgb(var(--primary));border-radius:999px;"></div>
                    </div>
                    
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        <span class="chip chip-primary">Plan: Moderado</span>
                        <span class="chip">Déficit: -450 kcal</span>
                        <span class="chip">Actividad: Moderada</span>
                    </div>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )


def render_kpis(profile: Dict, projection: Dict):
    """KPIs: Peso, Meta, Fecha"""
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown(
            f"""
            <div class="stat-card">
                <div class="icon-badge" style="margin-bottom:12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--primary))" stroke-width="1.75">
                        <path d="M12 3v18m-9-9h18"/>
                    </svg>
                </div>
                <div class="caption">Peso actual</div>
                <div class="metric-medium">{profile['weight_kg']:.1f} kg</div>
                <div class="caption" style="margin-top:8px;color:rgb(var(--text3));">+0.2 kg desde inicio</div>
            </div>
            """,
            unsafe_allow_html=True
        )
    
    with col2:
        st.markdown(
            f"""
            <div class="stat-card">
                <div class="icon-badge" style="margin-bottom:12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--primary))" stroke-width="1.75">
                        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                    </svg>
                </div>
                <div class="caption">Meta final</div>
                <div class="metric-medium">{profile['target_weight_kg']:.1f} kg</div>
                <div class="caption" style="margin-top:8px;color:rgb(var(--text3));">Faltan {abs(profile['weight_kg']-profile['target_weight_kg']):.1f} kg</div>
            </div>
            """,
            unsafe_allow_html=True
        )
    
    with col3:
        st.markdown(
            f"""
            <div class="stat-card">
                <div class="icon-badge" style="margin-bottom:12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--primary))" stroke-width="1.75">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                </div>
                <div class="caption">Fecha objetivo</div>
                <div class="metric-medium">{projection['target_date']}</div>
                <div class="caption" style="margin-top:8px;color:rgb(var(--text3));">~{projection['weeks']} semanas estimadas</div>
            </div>
            """,
            unsafe_allow_html=True
        )


def render_macros(macros: Dict):
    """Macros de hoy"""
    st.markdown(
        """
        <div class="apple-card">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">
                <div>
                    <h2 style="margin:0;">Macros de hoy</h2>
                    <div class="subtitle" style="margin-top:4px;">Distribución sugerida</div>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown(
            f"""
            <div class="mini-card">
                <div class="caption">Proteína</div>
                <div class="metric-medium">{macros['protein_g']} g</div>
                <div style="height:6px;background:rgb(var(--surface));border:1px solid rgb(var(--border));border-radius:999px;overflow:hidden;margin-top:12px;">
                    <div style="height:100%;width:0%;background:rgb(var(--primary));border-radius:999px;"></div>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
    
    with col2:
        st.markdown(
            f"""
            <div class="mini-card">
                <div class="caption">Carbohidratos</div>
                <div class="metric-medium">{macros['carbs_g']} g</div>
                <div style="height:6px;background:rgb(var(--surface));border:1px solid rgb(var(--border));border-radius:999px;overflow:hidden;margin-top:12px;">
                    <div style="height:100%;width:0%;background:rgb(var(--primary));border-radius:999px;"></div>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
    
    with col3:
        st.markdown(
            f"""
            <div class="mini-card">
                <div class="caption">Grasas</div>
                <div class="metric-medium">{macros['fat_g']} g</div>
                <div style="height:6px;background:rgb(var(--surface));border:1px solid rgb(var(--border));border-radius:999px;overflow:hidden;margin-top:12px;">
                    <div style="height:100%;width:0%;background:rgb(var(--primary));border-radius:999px;"></div>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )


def render_progress_chart():
    """Gráfica de progreso semanal"""
    dates = [(date.today() - timedelta(days=i)) for i in range(6, -1, -1)]
    weights = [78.2, 78.1, 78.0, 78.0, 77.9, 78.0, 78.0]
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=dates,
        y=weights,
        mode='lines+markers',
        line=dict(color='rgb(52, 199, 89)', width=2.5),
        marker=dict(size=8, color='rgb(52, 199, 89)'),
        name='Peso'
    ))
    
    fig.update_layout(
        height=260,
        margin=dict(l=0, r=0, t=20, b=0),
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font=dict(family='Inter', size=12, color='rgb(99, 99, 102)'),
        xaxis=dict(
            showgrid=True,
            gridcolor='rgba(229, 229, 234, 0.5)',
            showline=False,
            zeroline=False
        ),
        yaxis=dict(
            showgrid=True,
            gridcolor='rgba(229, 229, 234, 0.5)',
            showline=False,
            zeroline=False
        ),
        hovermode='x unified'
    )
    
    return fig


def render_adherence_ring(percentage: int):
    """Ring SVG de adherencia"""
    r = 44
    c = 2 * 3.14159 * r
    dash = (percentage / 100) * c
    
    return f"""
    <svg width="140" height="140" viewBox="0 0 120 120" style="display:block;margin:0 auto;">
        <circle cx="60" cy="60" r="{r}" fill="none" stroke="rgba(229,229,234,0.3)" stroke-width="10"/>
        <circle cx="60" cy="60" r="{r}" fill="none" stroke="rgb(52,199,89)" stroke-width="10" 
                stroke-linecap="round" stroke-dasharray="{dash} {c}" 
                transform="rotate(-90 60 60)"/>
        <text x="60" y="55" text-anchor="middle" font-size="32" font-weight="600" fill="rgb(28,28,30)">{percentage}%</text>
        <text x="60" y="72" text-anchor="middle" font-size="12" fill="rgb(142,142,147)">esta semana</text>
    </svg>
    """


def render_actions():
    """Acciones rápidas"""
    st.markdown(
        """
        <div class="apple-card">
            <h2 style="margin:0 0 16px 0;">Acciones rápidas</h2>
        </div>
        """,
        unsafe_allow_html=True
    )
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🍽️ Registrar comida", use_container_width=True):
            st.session_state['active_tab'] = 'nutricion'
            st.rerun()
    with col2:
        st.button("⚖️ Registrar peso", use_container_width=True)
    with col3:
        st.button("💪 Entrenar", use_container_width=True)


def render_onboarding():
    """Pantalla de onboarding"""
    st.markdown(
        """
        <div style="max-width:560px;margin:60px auto;text-align:center;">
            <div style="width:80px;height:80px;border-radius:20px;background:rgba(var(--primary),0.14);border:1px solid rgba(var(--primary),0.18);display:grid;place-items:center;margin:0 auto 24px;">
                <div style="width:16px;height:16px;border-radius:999px;background:rgb(var(--primary));"></div>
            </div>
            <h1 style="margin:0 0 12px 0;">Bienvenido a SummerFit</h1>
            <div class="subtitle" style="margin-bottom:40px;">Tu coach personal de fitness. Vamos a configurar tu perfil en 3 pasos.</div>
        </div>
        """,
        unsafe_allow_html=True
    )
    
    step = st.session_state.get('onboarding_step', 1)
    
    if step == 1:
        st.markdown('<div class="apple-card" style="max-width:560px;margin:0 auto;">', unsafe_allow_html=True)
        st.markdown('<h2 style="margin:0 0 20px 0;">Paso 1: Datos básicos</h2>', unsafe_allow_html=True)
        
        col1, col2 = st.columns(2)
        with col1:
            gender = st.selectbox("Género", ["M", "F"], key="ob_gender")
            age = st.number_input("Edad", 14, 90, 28, key="ob_age")
        with col2:
            height = st.number_input("Altura (cm)", 120, 220, 175, key="ob_height")
            activity = st.selectbox("Actividad", ["Sedentario", "Ligero", "Moderado", "Activo", "Muy activo"], index=2, key="ob_activity")
        
        if st.button("Continuar →", use_container_width=True):
            st.session_state['onboarding_step'] = 2
            st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)
    
    elif step == 2:
        st.markdown('<div class="apple-card" style="max-width:560px;margin:0 auto;">', unsafe_allow_html=True)
        st.markdown('<h2 style="margin:0 0 20px 0;">Paso 2: Tu objetivo</h2>', unsafe_allow_html=True)
        
        col1, col2 = st.columns(2)
        with col1:
            weight = st.number_input("Peso actual (kg)", 35.0, 220.0, 78.0, 0.1, key="ob_weight")
            goal = st.selectbox("Objetivo", ["Definir", "Mantener", "Volumen"], key="ob_goal")
        with col2:
            target = st.number_input("Peso objetivo (kg)", 35.0, 220.0, 72.0, 0.1, key="ob_target")
            diet = st.selectbox("Tipo de dieta", ["Estándar", "Keto", "Vegana", "Vegetariana", "Paleo", "Mediterránea"], key="ob_diet")
        
        col_a, col_b = st.columns(2)
        with col_a:
            if st.button("← Atrás", use_container_width=True):
                st.session_state['onboarding_step'] = 1
                st.rerun()
        with col_b:
            if st.button("Continuar →", use_container_width=True):
                st.session_state['onboarding_step'] = 3
                st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)
    
    elif step == 3:
        st.markdown('<div class="apple-card" style="max-width:560px;margin:0 auto;">', unsafe_allow_html=True)
        st.markdown('<h2 style="margin:0 0 20px 0;">Paso 3: Elige tu plan</h2>', unsafe_allow_html=True)
        
        plan = st.radio(
            "Velocidad de progreso",
            ["Conservador (0.35 kg/sem)", "Moderado (0.6 kg/sem)", "Acelerado (1.0 kg/sem)"],
            index=1,
            key="ob_plan"
        )
        
        st.info("💡 Recomendamos el plan Moderado para resultados sostenibles sin efecto rebote.")
        
        col_a, col_b = st.columns(2)
        with col_a:
            if st.button("← Atrás", use_container_width=True):
                st.session_state['onboarding_step'] = 2
                st.rerun()
        with col_b:
            if st.button("✓ Comenzar", use_container_width=True):
                st.session_state['onboarding_complete'] = True
                st.session_state['profile'] = {
                    'gender': st.session_state.get('ob_gender', 'M'),
                    'age': st.session_state.get('ob_age', 28),
                    'height_cm': st.session_state.get('ob_height', 175),
                    'weight_kg': st.session_state.get('ob_weight', 78.0),
                    'target_weight_kg': st.session_state.get('ob_target', 72.0),
                    'activity_level': st.session_state.get('ob_activity', 'Moderado'),
                    'goal': st.session_state.get('ob_goal', 'Definir'),
                    'diet_type': st.session_state.get('ob_diet', 'Estándar')
                }
                st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)


def main():
    load_apple_styles()
    
    # Inicializar estado
    if 'theme' not in st.session_state:
        st.session_state['theme'] = 'light'
    if 'active_tab' not in st.session_state:
        st.session_state['active_tab'] = 'resumen'
    if 'onboarding_complete' not in st.session_state:
        st.session_state['onboarding_complete'] = False
    
    # Mostrar onboarding si no está completo
    if not st.session_state['onboarding_complete']:
        render_onboarding()
        return
    
    # Header con toggle tema
    col_logo, col_spacer, col_theme = st.columns([2, 6, 1])
    
    with col_logo:
        st.markdown(
            """
            <div style="display:flex;align-items:center;gap:12px;padding:16px 0;">
                <div style="width:40px;height:40px;border-radius:12px;background:rgba(var(--primary),0.14);border:1px solid rgba(var(--primary),0.18);display:grid;place-items:center;">
                    <div style="width:8px;height:8px;border-radius:999px;background:rgb(var(--primary));"></div>
                </div>
                <div>
                    <div style="font-size:17px;font-weight:600;color:rgb(var(--text));">SummerFit</div>
                    <div class="caption">Tu coach personal</div>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
    
    with col_theme:
        st.markdown('<div style="padding:16px 0;">', unsafe_allow_html=True)
        if st.button("🌙" if st.session_state['theme'] == 'light' else "☀️", key="theme_toggle"):
            st.session_state['theme'] = 'dark' if st.session_state['theme'] == 'light' else 'light'
            st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)
    
    # Tabs de navegación
    tabs = st.tabs(["🏠 Resumen", "🍽️ Nutrición", "💪 Entrenar", "📊 Progreso", "👤 Perfil"])
    
    # Obtener perfil
    profile = st.session_state.get('profile', {
        "gender": "M",
        "age": 28,
        "height_cm": 175,
        "weight_kg": 78.0,
        "target_weight_kg": 72.0,
        "activity_level": "Moderado",
        "goal": "Definir",
        "diet_type": "Estándar"
    })
    
    targets = calculate_targets(profile)
    projection = calculate_projection_v2(
        profile["weight_kg"],
        profile["target_weight_kg"],
        targets["tdee"],
        mode="Moderado"
    )
    base_macros = macro_targets(profile["weight_kg"], projection["daily_calories"])
    macros = adjusted_macros_by_diet(profile, base_macros, profile["diet_type"])
    
    # Tab Resumen
    with tabs[0]:
        st.markdown(
            """
            <div style="margin-bottom:24px;">
                <h1 style="margin:0;">Resumen</h1>
                <div class="subtitle" style="margin-top:6px;">Una vista clara de tu día: calorías, macros y progreso.</div>
            </div>
            """,
            unsafe_allow_html=True
        )
        
        render_hero_section(profile, projection)
        st.markdown("<div style='height:16px;'></div>", unsafe_allow_html=True)
        
        render_kpis(profile, projection)
        st.markdown("<div style='height:16px;'></div>", unsafe_allow_html=True)
        
        render_macros(macros)
        st.markdown("<div style='height:16px;'></div>", unsafe_allow_html=True)
        
        # Progreso y adherencia
        col1, col2 = st.columns([2, 1])
        with col1:
            st.markdown('<div class="apple-card"><h2 style="margin:0 0 16px 0;">Progreso semanal</h2></div>', unsafe_allow_html=True)
            st.plotly_chart(render_progress_chart(), use_container_width=True)
        
        with col2:
            st.markdown('<div class="apple-card"><h2 style="margin:0 0 16px 0;">Adherencia</h2>', unsafe_allow_html=True)
            st.markdown(render_adherence_ring(0), unsafe_allow_html=True)
            st.markdown('<div class="caption" style="text-align:center;margin-top:12px;">Registra tu primera comida</div></div>', unsafe_allow_html=True)
        
        st.markdown("<div style='height:16px;'></div>", unsafe_allow_html=True)
        render_actions()
    
    # Tab Nutrición
    with tabs[1]:
        st.markdown('<h1 style="margin:0 0 24px 0;">Nutrición</h1>', unsafe_allow_html=True)
        st.markdown('<div class="apple-card"><h2>Registrar comida</h2><p class="subtitle">Busca y agrega alimentos a tu registro diario</p></div>', unsafe_allow_html=True)
    
    # Tab Entrenar
    with tabs[2]:
        st.markdown('<h1 style="margin:0 0 24px 0;">Entrenar</h1>', unsafe_allow_html=True)
        st.markdown('<div class="apple-card"><h2>Registro de ejercicio</h2><p class="subtitle">Registra tu actividad física diaria</p></div>', unsafe_allow_html=True)
    
    # Tab Progreso
    with tabs[3]:
        st.markdown('<h1 style="margin:0 0 24px 0;">Progreso</h1>', unsafe_allow_html=True)
        st.markdown('<div class="apple-card"><h2>Tu evolución</h2><p class="subtitle">Gráficas y estadísticas de tu progreso</p></div>', unsafe_allow_html=True)
    
    # Tab Perfil
    with tabs[4]:
        st.markdown('<h1 style="margin:0 0 24px 0;">Perfil</h1>', unsafe_allow_html=True)
        st.markdown('<div class="apple-card">', unsafe_allow_html=True)
        st.markdown('<h2 style="margin:0 0 16px 0;">Configuración</h2>', unsafe_allow_html=True)
        
        col1, col2 = st.columns(2)
        with col1:
            st.selectbox("Género", ["M", "F"], index=0 if profile['gender']=='M' else 1)
            st.number_input("Edad", 14, 90, profile['age'])
            st.number_input("Altura (cm)", 120, 220, profile['height_cm'])
        with col2:
            st.number_input("Peso actual (kg)", 35.0, 220.0, profile['weight_kg'], 0.1)
            st.number_input("Peso objetivo (kg)", 35.0, 220.0, profile['target_weight_kg'], 0.1)
            st.selectbox("Actividad", ["Sedentario", "Ligero", "Moderado", "Activo", "Muy activo"], index=2)
        
        if st.button("Guardar cambios", use_container_width=True):
            st.success("✓ Perfil actualizado")
        
        st.markdown('</div>', unsafe_allow_html=True)
    
    # Footer
    st.markdown(
        """
        <div style="margin-top:48px;text-align:center;padding:24px;">
            <div class="caption">ℹ️ Esta app es solo informativa. Consulta a un profesional médico antes de hacer cambios en tu dieta o ejercicio.</div>
        </div>
        """,
        unsafe_allow_html=True
    )


if __name__ == "__main__":
    main()
