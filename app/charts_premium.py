"""Plotly charts with a premium Linear/Vercel-inspired theme and projection line."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, List

import plotly.express as px
import plotly.graph_objects as go

PALETTE = {
    "primary": "#6366f1",
    "secondary": "#8b5cf6",
    "success": "#10b981",
    "warning": "#f59e0b",
    "danger": "#ef4444",
    "bg": "#0f172a",
    "muted": "#94a3b8",
}


def _base_layout(fig: go.Figure, height: int = 320) -> go.Figure:
    fig.update_layout(
        height=height,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font_color="#f8fafc",
        margin=dict(l=20, r=20, t=40, b=40),
    )
    return fig


def macro_bars(data: Dict[str, float]) -> go.Figure:
    macros = list(data.keys())
    values = [float(v) for v in data.values()]
    fig = px.bar(
        x=macros,
        y=values,
        text=[f"{v:g}g" for v in values],
        color=macros,
        color_discrete_sequence=[PALETTE["primary"], PALETTE["secondary"], PALETTE["warning"]],
    )
    fig.update_traces(textposition="outside", textfont_size=14)
    return _base_layout(fig)


def calorie_ring(current: float, target: float) -> go.Figure:
    target = max(target, 1)
    progress = max(min(current, target), 0)
    segments = 80
    progress_segments = int((progress / target) * segments)
    gradient_colors = []
    for i in range(max(progress_segments, 1)):
        blend = i / max(progress_segments - 1, 1)
        gradient_colors.append(
            f"rgb({int(99 + (139 - 99) * blend)}, {int(102 + (92 - 102) * blend)}, {int(241 + (246 - 241) * blend)})"
        )

    colors = []
    for idx in range(segments):
        if idx < progress_segments:
            colors.append(gradient_colors[min(idx, len(gradient_colors) - 1)])
        else:
            colors.append("rgba(255,255,255,0.1)")

    fig = go.Figure(
        go.Pie(
            values=[1] * segments,
            hole=0.72,
            sort=False,
            direction="clockwise",
            marker={"colors": colors, "line": {"width": 0}},
            textinfo="none",
        )
    )
    fig.update_layout(
        annotations=[
            dict(
                text=f"<span style='font-size:28px;font-weight:800'>{progress:.0f}</span><br><span style='color:{PALETTE['muted']};font-size:12px'>/ {target:.0f} kcal</span>",
                x=0.5,
                y=0.5,
                showarrow=False,
                font=dict(color="#e2e8f0"),
                align="center",
            )
        ],
        showlegend=False,
    )
    return _base_layout(fig, height=260)


def weight_trend(dates: List[date], weights: List[float], target_rate: float | None = None) -> go.Figure:
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=dates,
            y=weights,
            mode="lines+markers",
            line={"width": 4, "color": PALETTE["secondary"]},
            marker={"size": 10, "color": PALETTE["primary"]},
            name="Peso real",
        )
    )

    if target_rate is not None and dates:
        last_date = dates[-1]
        last_weight = weights[-1]
        projection_dates = [last_date + timedelta(weeks=i) for i in range(1, 9)]
        projection_weights = [last_weight - target_rate * i for i in range(1, 9)]
        fig.add_trace(
            go.Scatter(
                x=projection_dates,
                y=projection_weights,
                mode="lines",
                line={"dash": "dash", "color": PALETTE["muted"], "width": 3},
                name="Proyección",
            )
        )

    fig.update_layout(
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    return _base_layout(fig, height=360)


def adherence_heatmap(days: List[str], weeks: List[str], values: List[List[int]]) -> go.Figure:
    fig = go.Figure(
        data=go.Heatmap(
            z=values,
            x=weeks,
            y=days,
            colorscale=[
                [0, "rgba(239,68,68,0.25)"],
                [0.5, "rgba(245,158,11,0.35)"],
                [1, "rgba(16,185,129,0.65)"],
            ],
            showscale=False,
        )
    )
    fig.update_layout(margin=dict(l=0, r=0, t=10, b=10))
    return _base_layout(fig)


def goal_gauge(progress_pct: float) -> go.Figure:
    """Gauge chart showing progress towards goal."""
    progress_pct = max(0, min(progress_pct, 100))
    
    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=progress_pct,
            number={"suffix": "%", "font": {"size": 48, "color": "#f1f5f9"}},
            gauge={
                "axis": {"range": [0, 100], "tickwidth": 1, "tickcolor": PALETTE["muted"]},
                "bar": {"color": PALETTE["primary"]},
                "bgcolor": "rgba(255,255,255,0.1)",
                "borderwidth": 2,
                "bordercolor": "rgba(255,255,255,0.2)",
                "steps": [
                    {"range": [0, 33], "color": "rgba(239,68,68,0.2)"},
                    {"range": [33, 66], "color": "rgba(245,158,11,0.2)"},
                    {"range": [66, 100], "color": "rgba(16,185,129,0.2)"},
                ],
                "threshold": {
                    "line": {"color": PALETTE["secondary"], "width": 4},
                    "thickness": 0.75,
                    "value": progress_pct,
                },
            },
        )
    )
    
    fig.update_layout(
        annotations=[
            dict(
                text="Progreso",
                x=0.5,
                y=0.15,
                showarrow=False,
                font=dict(size=14, color=PALETTE["muted"]),
            )
        ]
    )
    
    return _base_layout(fig, height=280)
