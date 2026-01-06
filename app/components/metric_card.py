"""Tiny helper to render metric cards with consistent styling."""
from __future__ import annotations

import streamlit as st


def metric_card(container, title: str, value: str, subtitle: str, accent: str = "primary"):
    container.markdown(
        f"""
        <div class="sf-card sf-card--{accent}">
            <p class="sf-label">{title}</p>
            <div class="sf-value">{value}</div>
            <p class="sf-subtle">{subtitle}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

