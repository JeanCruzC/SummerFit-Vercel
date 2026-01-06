"""Simple food search autocomplete rendered with HTML for speed."""
from __future__ import annotations

import json
from typing import List

import streamlit as st
from pandas import DataFrame


def food_search(df: DataFrame, placeholder: str = "Ej. pollo, avena, yogurt", key: str = "food-search") -> str:
    sample = [
        {
            "name": row.get("name", "Alimento"),
            "kcal": row.get("kcal_per_100g", "?"),
            "protein": row.get("protein_g_per_100g", "?"),
            "carbs": row.get("carbs_g_per_100g", "?"),
            "fat": row.get("fat_g_per_100g", "?"),
        }
        for _, row in df.head(30).iterrows()
    ]
    st.markdown(
        f"""
        <div class="sf-search" id="sf-search" data-items='{json.dumps(sample)}'></div>
        <script>
          const root = window.document.getElementById("sf-search");
          if (root && !root.dataset.mounted) {{
            const data = JSON.parse(root.dataset.items || "[]");
            root.dataset.mounted = "true";
            root.innerHTML = `
              <label class="sf-search__label">Busca alimentos</label>
              <input class="sf-search__input" placeholder="{placeholder}" />
              <div class="sf-search__dropdown"></div>
            `;
            const input = root.querySelector("input");
            const dropdown = root.querySelector(".sf-search__dropdown");
            input.addEventListener("input", () => {{
              const term = input.value.toLowerCase();
              dropdown.innerHTML = "";
              if (!term) {{ dropdown.classList.remove("is-open"); return; }}
              const matches = data.filter(item => item.name.toLowerCase().includes(term)).slice(0, 6);
              matches.forEach(item => {{
                const row = document.createElement("div");
                row.className = "sf-search__item";
                row.innerHTML = `
                  <div class="sf-search__icon">🍽️</div>
                  <div>
                    <strong>${{item.name}}</strong>
                    <p>${{item.kcal}} kcal · ${{item.protein}}g P · ${{item.carbs}}g C · ${{item.fat}}g G</p>
                  </div>
                `;
                row.onclick = () => {{ input.value = item.name; dropdown.classList.remove("is-open"); }};
                dropdown.appendChild(row);
              }});
              dropdown.classList.toggle("is-open", matches.length > 0);
            }});
          }}
        </script>
        """,
        unsafe_allow_html=True,
    )
    return st.text_input("Selecciona alimento", placeholder=placeholder, key=key)
