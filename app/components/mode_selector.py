"""Selector visual de modo (Acelerado, Moderado, Conservador) estilo card."""
from __future__ import annotations

from typing import List

import streamlit as st

MODE_OPTIONS: List[dict] = [
    {"name": "Acelerado", "emoji": "🚀", "rate": "1.0", "tagline": "Máxima velocidad", "note": "Solo para fases cortas."},
    {"name": "Moderado", "emoji": "✅", "rate": "0.6", "tagline": "Balance ideal", "note": "Sostenible y flexible."},
    {"name": "Conservador", "emoji": "🐢", "rate": "0.35", "tagline": "Lento y seguro", "note": "Menos fatiga y rebote."},
]


def render_mode_selector(default: str = "Moderado") -> str:
    if "mode_selection" not in st.session_state:
        st.session_state["mode_selection"] = default
    selection = st.session_state.get("mode_selection", default)

    cols = st.columns(3)
    for col, mode in zip(cols, MODE_OPTIONS):
        is_active = selection == mode["name"]
        with col.container():
            st.markdown(
                f"<div class='mode-card {'active' if is_active else ''}'>",
                unsafe_allow_html=True,
            )
            if st.button(
                f"{mode['emoji']} {mode['name']} — {mode['rate']} kg/semana\n{mode['tagline']}",
                key=f"mode-btn-{mode['name']}",
                use_container_width=True,
            ):
                selection = mode["name"]
            st.markdown(
                f"<div class='mode-subtitle'>{mode['note']}</div></div>",
                unsafe_allow_html=True,
            )

    st.session_state["mode_selection"] = selection
    st.markdown(
        f"<div style='color:#f1f5f9;margin-top:12px;font-size:1rem;font-weight:600;text-align:center;'>Modo activo: <strong style='color:{ {'Acelerado':'#f87171','Moderado':'#34d399','Conservador':'#60a5fa'}[selection]};'>{selection}</strong></div>",
        unsafe_allow_html=True,
    )
    return selection
