from __future__ import annotations

from typing import Dict, List

import plotly.graph_objects as go

Palette = {
    "accent": "#5EF0C6",
    "accent2": "#7DC8FF",
    "danger": "#FF6B6B",
    "warning": "#F1C40F",
    "bg": "#0E172A",
    "neutral": "#202b40",
}


def calorie_gauge(value: int, label: str = "Kcal objetivo") -> go.Figure:
    max_value = max(value * 1.3, value + 400)
    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=value,
            title={"text": label},
            gauge={
                "axis": {"range": [0, max_value], "tickwidth": 1, "tickcolor": "#cdd6f6"},
                "bar": {"color": Palette["accent"]},
                "bgcolor": "rgba(0,0,0,0)",
                "borderwidth": 0,
                "steps": [
                    {"range": [0, 0.65 * max_value], "color": "rgba(94,240,198,0.15)"},
                    {"range": [0.65 * max_value, 0.9 * max_value], "color": "rgba(125,200,255,0.18)"},
                    {"range": [0.9 * max_value, max_value], "color": "rgba(255,107,107,0.14)"},
                ],
                "threshold": {"line": {"color": "#FF6B6B", "width": 4}, "thickness": 0.75, "value": value},
            },
            number={"valueformat": ",", "font": {"size": 32, "color": "#f6fbff"}},
        )
    )
    fig.update_layout(
        margin=dict(l=10, r=10, t=30, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
        font={"color": "#f6fbff", "family": "Inter, sans-serif"},
    )
    return fig


def macro_rings(macros: Dict[str, int]) -> go.Figure:
    labels = list(macros.keys())
    values = list(macros.values())
    colors = ["#5EF0C6", "#7DC8FF", "#F1C40F"]

    fig = go.Figure(
        go.Pie(
            labels=labels,
            values=values,
            hole=0.6,
            marker={"colors": colors, "line": {"color": "#0E172A", "width": 2}},
            hovertemplate="%{label}: %{value:.0f}g<extra></extra>",
        )
    )
    fig.update_layout(
        showlegend=True,
        legend=dict(orientation="h", y=-0.1),
        margin=dict(l=10, r=10, t=10, b=10),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#f6fbff", "family": "Inter, sans-serif"},
    )
    return fig


def weekly_progress(days: List[str], kcal: List[int], weights: List[float]) -> go.Figure:
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=days,
            y=kcal,
            mode="lines+markers",
            name="Calorías",
            line=dict(color="#7DC8FF", width=3),
            fill="tozeroy",
            hovertemplate="Día %{x}<br>Calorías %{y:,}<extra></extra>",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=days,
            y=weights,
            mode="lines+markers",
            name="Peso (kg)",
            yaxis="y2",
            line=dict(color="#5EF0C6", width=3, dash="dot"),
            hovertemplate="Día %{x}<br>Peso %{y:.1f} kg<extra></extra>",
        )
    )
    fig.update_layout(
        margin=dict(l=0, r=30, t=10, b=10),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#f6fbff", "family": "Inter, sans-serif"},
        yaxis=dict(title="Calorías"),
        yaxis2=dict(title="Peso (kg)", overlaying="y", side="right"),
        legend=dict(orientation="h", y=-0.1),
    )
    return fig


def adherence_heatmap(days: List[str], macros: List[str], matrix: List[List[int]]) -> go.Figure:
    fig = go.Figure(
        data=go.Heatmap(
            z=matrix,
            x=days,
            y=macros,
            colorscale=[
                [0, "rgb(54, 84, 150)"],
                [0.5, "rgb(94, 240, 198)"],
                [1, "rgb(255, 207, 64)"],
            ],
            hovertemplate="%{y} - %{x}: %{z} %<extra></extra>",
        )
    )
    fig.update_layout(
        margin=dict(l=0, r=0, t=10, b=40),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#f6fbff", "family": "Inter, sans-serif"},
    )
    return fig


def github_calendar_heatmap(weeks: List[str], days: List[str], values: List[List[int]]) -> go.Figure:
    fig = go.Figure(
        data=go.Heatmap(
            z=values,
            x=weeks,
            y=days,
            colorscale=[
                [0.0, "rgb(18, 29, 51)"],
                [0.25, "rgb(36, 61, 100)"],
                [0.5, "rgb(94, 240, 198)"],
                [0.75, "rgb(255, 207, 64)"],
                [1.0, "rgb(255, 107, 107)"],
            ],
            hovertemplate="Semana %{x}<br>%{y}: %{z}% cumplido<extra></extra>",
            showscale=False,
        )
    )
    fig.update_layout(
        margin=dict(l=0, r=0, t=20, b=20),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#f6fbff", "family": "Inter, sans-serif"},
        xaxis=dict(showgrid=False, showticklabels=False, zeroline=False),
        yaxis=dict(showgrid=False, zeroline=False, tickfont=dict(color="#cdd6f6")),
    )
    return fig


def body_composition_bar(comp: Dict[str, float]) -> go.Figure:
    fig = go.Figure(
        go.Bar(
            x=list(comp.values()),
            y=["Composición"],
            orientation="h",
            marker=dict(color=["#5EF0C6", "#7DC8FF", "#F1C40F"]),
            hovertemplate="%{x}% %{customdata}<extra></extra>",
            customdata=list(comp.keys()),
        )
    )
    fig.update_layout(
        barmode="stack",
        margin=dict(l=0, r=0, t=10, b=20),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#f6fbff", "family": "Inter, sans-serif"},
        xaxis=dict(range=[0, 100], showgrid=False, zeroline=False),
        yaxis=dict(showticklabels=False),
        showlegend=False,
    )
    return fig


def radial_adherence(labels: List[str], values: List[int]) -> go.Figure:
    fig = go.Figure(
        go.Barpolar(
            r=values,
            theta=labels,
            marker=dict(
                color=["#5EF0C6", "#7DC8FF", "#F1C40F", "#FF6B6B"],
                line=dict(color="#0E172A", width=2),
            ),
            opacity=0.95,
            hovertemplate="%{theta}: %{r} %<extra></extra>",
        )
    )
    fig.update_layout(
        margin=dict(l=0, r=0, t=0, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
        polar=dict(
            bgcolor="rgba(0,0,0,0)",
            angularaxis=dict(showgrid=False, tickfont=dict(color="#cdd6f6")),
            radialaxis=dict(range=[0, 100], showgrid=False, tickfont=dict(color="#cdd6f6")),
        ),
        showlegend=False,
    )
    return fig


def timeline_weight(days: List[str], weights: List[float]) -> go.Figure:
    fig = go.Figure(
        go.Scatter(
            x=days,
            y=weights,
            mode="lines+markers",
            line=dict(color="#5EF0C6", width=4),
            marker=dict(size=10, color="#0E172A", line=dict(color="#5EF0C6", width=3)),
            fill="tonexty",
            hovertemplate="%{x}: %{y:.1f} kg<extra></extra>",
        )
    )
    fig.update_layout(
        margin=dict(l=0, r=0, t=10, b=30),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#f6fbff", "family": "Inter, sans-serif"},
        xaxis=dict(showgrid=False),
        yaxis=dict(showgrid=False),
    )
    return fig
