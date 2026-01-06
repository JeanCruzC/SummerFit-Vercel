from __future__ import annotations

import json
from typing import List

import streamlit as st
import streamlit.components.v1 as components


def wizard_nav(steps: List[str], current: int) -> None:
    """Render a minimal, client-side animated stepper.

    This uses a vanilla JS fragment (no external bundle) so it works inside Streamlit
    while keeping room to swap in a React build later without touching Python.
    """
    payload = {"steps": steps, "current": current}
    components.html(
        f"""
        <div id="sf-stepper-root"></div>
        <script>
          const data = {json.dumps(payload)};
          const root = document.getElementById("sf-stepper-root");
          const gradient = ["#5EF0C6", "#7DC8FF", "#F1C40F", "#FF6B6B"];
          root.style.display = "grid";
          root.style.gridTemplateColumns = `repeat(${len(steps)}, minmax(120px,1fr))`;
          root.style.gap = "8px";

          data.steps.forEach((step, idx) => {{
            const card = document.createElement("div");
            card.style.padding = "12px 14px";
            card.style.borderRadius = "12px";
            card.style.border = "1px solid rgba(255,255,255,0.14)";
            card.style.background = idx <= data.current
              ? "linear-gradient(120deg, rgba(94,240,198,0.22), rgba(125,200,255,0.18))"
              : "rgba(255,255,255,0.06)";
            card.style.color = "#f6fbff";
            card.style.fontWeight = 700;
            card.style.display = "flex";
            card.style.alignItems = "center";
            card.style.gap = "8px";
            card.style.transition = "transform 0.2s ease";
            card.onmouseenter = () => card.style.transform = "translateY(-2px)";
            card.onmouseleave = () => card.style.transform = "translateY(0)";

            const bullet = document.createElement("span");
            bullet.innerText = idx + 1;
            bullet.style.display = "inline-flex";
            bullet.style.width = "26px";
            bullet.style.height = "26px";
            bullet.style.alignItems = "center";
            bullet.style.justifyContent = "center";
            bullet.style.borderRadius = "50%";
            bullet.style.background = idx === data.current ? gradient[idx % gradient.length] : "rgba(255,255,255,0.08)";
            bullet.style.color = idx === data.current ? "#0e172a" : "#cdd6f6";
            card.appendChild(bullet);

            const label = document.createElement("span");
            label.textContent = step;
            label.style.letterSpacing = "0.02em";
            card.appendChild(label);

            root.appendChild(card);
          }});
        </script>
        """,
        height=80,
    )
