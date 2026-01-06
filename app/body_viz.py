from __future__ import annotations

from dataclasses import dataclass


@dataclass
class BodyParams:
    shoulder: float
    waist: float
    hip: float
    height: float
    head: float


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def body_metrics(height_cm: float, bmi: float, gender: str) -> BodyParams:
    base_width = 38 if gender == "F" else 42
    shoulder = _clamp(base_width + (bmi - 21) * 1.4, 34, 78)
    waist = _clamp(base_width - 4 + (bmi - 21) * 1.1, 28, 70)
    hip = _clamp(base_width + 2 + (bmi - 21) * 1.25, 32, 80)
    head = _clamp(18 + (bmi - 21) * 0.25, 16, 26)
    height = _clamp(height_cm / 2.6, 160, 240)
    return BodyParams(shoulder=shoulder, waist=waist, hip=hip, height=height, head=head)


def render_body_svg(height_cm: float, weight_kg: float, age: int, gender: str) -> str:
    bmi = weight_kg / ((height_cm / 100) ** 2)
    params = body_metrics(height_cm, bmi, gender)
    shoulder = params.shoulder
    waist = params.waist
    hip = params.hip
    head = params.head

    top_y = 30
    torso_top = top_y + head + 10
    torso_bottom = torso_top + 180
    leg_bottom = torso_bottom + 110

    svg = f"""
    <div class="sf-body-wrapper">
      <style>
        .body-gradient {{
          fill: url(#bodyGradient);
          stroke: rgba(255,255,255,0.35);
          stroke-width: 2;
          filter: drop-shadow(0 20px 28px rgba(0,0,0,0.45));
          transition: all 240ms ease;
        }}
        .body-highlight {{
          fill: url(#highlight);
          opacity: 0.75;
        }}
      </style>
      <svg viewBox="0 0 260 360" role="img" aria-label="Visualización corporal">
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#7DC8FF" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#5EF0C6" stop-opacity="0.9"/>
          </linearGradient>
          <radialGradient id="highlight" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.65)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <circle cx="130" cy="{top_y + head/2}" r="{head/2}" fill="url(#bodyGradient)" opacity="0.92" />
        <path class="body-gradient" d="
          M {130 - shoulder/2} {torso_top}
          Q 130 {torso_top - 24}, {130 + shoulder/2} {torso_top}
          L {130 + shoulder/2} {torso_top + 60}
          Q 130 {torso_top + 40}, {130 - shoulder/2} {torso_top + 60}
          Z" />
        <path class="body-gradient" d="
          M {130 - shoulder/2} {torso_top + 12}
          C {130 - waist/2} {torso_top + 90}, {130 - waist/2} {torso_bottom - 40}, {130 - hip/2} {torso_bottom}
          L {130 + hip/2} {torso_bottom}
          C {130 + waist/2} {torso_bottom - 40}, {130 + waist/2} {torso_top + 90}, {130 + shoulder/2} {torso_top + 12}
          Z" />
        <rect x="{130 - hip/2 + 6}" y="{torso_bottom - 10}" width="{hip - 12}" height="16" rx="8" fill="#0E172A" opacity="0.35" />
        <path class="body-gradient" d="
          M {130 - hip/2 + 12} {torso_bottom}
          Q 115 {leg_bottom - 30}, 130 {leg_bottom}
          Q 145 {leg_bottom - 30}, {130 + hip/2 - 12} {torso_bottom}
          Z" opacity="0.9"/>
        <ellipse cx="130" cy="{torso_bottom + 16}" rx="22" ry="8" fill="#0E172A" opacity="0.25"/>
        <circle cx="130" cy="{torso_top + 76}" r="52" class="body-highlight"/>
        <text x="10" y="340" fill="#e9edf5" font-size="12" font-family="Inter" opacity="0.75">
          BMI {bmi:.1f} · Edad {age} · { 'Hombre' if gender=='M' else 'Mujer' }
        </text>
      </svg>
    </div>
    """
    return svg
