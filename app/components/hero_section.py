"""Hero section for the premium dashboard."""
from __future__ import annotations

import streamlit as st

from app.charts_premium import goal_gauge
from app.components.metric_card import metric_card


def render_hero(user_name: str, weight: float, target_weight: float, delta: float, progress_pct: float, macros: dict):
    st.markdown('<div class="sf-hero-grid">', unsafe_allow_html=True)
    col1, col2 = st.columns([1.6, 1])
    with col1:
        st.markdown(
            f"""
            <div class="sf-hero">
                <div class="sf-hero__header">
                    <div>
                        <p class="sf-kicker">Hola, {user_name} 👋</p>
                        <h2>Tu cockpit de fitness premium</h2>
                        <p class="sf-subtle">Seguimiento integral con autenticación, proyecciones y registros diarios.</p>
                    </div>
                    <div class="sf-pill sf-pill--glass">Glassmorphism · Linear vibes</div>
                </div>
                <div class="sf-actions">
                    <button class="sf-button sf-button--ghost">➕ Registrar comida</button>
                    <button class="sf-button sf-button--outline">📊 Ver progreso</button>
                    <button class="sf-button sf-button--solid">🎯 Ajustar meta</button>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        cards_cols = st.columns(3)
        metric_card(cards_cols[0], "Peso actual", f"{weight:.1f} kg", f"Δ {delta:+.1f} kg vs semana", accent="primary")
        metric_card(cards_cols[1], "Objetivo", f"{target_weight:.1f} kg", "Ruta personalizada", accent="secondary")
        metric_card(cards_cols[2], "Proteína", f"{macros.get('protein_g', 0)} g", "Meta diaria", accent="success")
    with col2:
        st.plotly_chart(goal_gauge(progress_pct), use_container_width=True, config={"displayModeBar": False})
    st.markdown("</div>", unsafe_allow_html=True)

