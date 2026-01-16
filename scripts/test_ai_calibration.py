#!/usr/bin/env python3
"""
TEST SCRIPT FOR AI CALIBRATION
Runs a specific list of foods against the AI prompt to verify logic.
"""

import os
import json
import asyncio
from dotenv import load_dotenv
from pathlib import Path

# Load env variables (Just for OpenAI/Qwen keys)
script_dir = Path(__file__).parent.parent
env_file = script_dir / "web" / ".env.local"
load_dotenv(env_file)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") 
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

# Import the LIVE prompt from the main script to ensure we test the real logic
try:
    from ai_classify_foods import SYSTEM_PROMPT
except ImportError:
    print("Could not import SYSTEM_PROMPT. Make sure ai_classify_foods.py is in the same directory.")
    exit(1)

# -------------------------------------------------------------
# NEW CHALLENGING TEST CASES
# -------------------------------------------------------------
TEST_FOODS = [
    {"id": 10, "name": "Salmón Ahumado"},              # Edge case: Processed but simple ingredient? (Expect TRUE/FALSE depending on strictness)
    {"id": 11, "name": "Barrita de Proteína Quest"},   # Expect FALSE (Supplement/Ultra-processed)
    {"id": 12, "name": "Avena Instantánea sabor Manzana Canela"}, # Expect FALSE (Added sugar/flavor)
    {"id": 13, "name": "Huevo Duro"},                  # Expect TRUE (Simple prep)
    {"id": 14, "name": "Coca Cola Zero"},              # Expect FALSE (Drink/Chemical)
    {"id": 15, "name": "Aceite de Oliva Extra Virgen"},# Expect TRUE (Basic staple)
    {"id": 16, "name": "Aguacate Hass"},               # Expect TRUE (Fresh produce)
    {"id": 17, "name": "Atún en Agua (Lata)"},         # Expect TRUE (Staple pantry item)
    {"id": 18, "name": "Salsa de Tomate Prego (Frasco)"}, # Expect FALSE (Complex sauce w/ many ingredients)
    {"id": 19, "name": "Mix de Frutos Secos con M&Ms"} # Expect FALSE (Candy mixed in)
]

async def run_test():
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)
    except ImportError:
        print("Please install openai")
        return

    print("🧪 STARTING CALIBRATION TEST...")
    print(f"Target Model: {OPENAI_MODEL}")
    print("-" * 60)
    print(f"{'FOOD NAME':<40} | {'EXPECTED':<10} | {'ACTUAL':<10} |REASON")
    print("-" * 60)

    items_str = json.dumps(TEST_FOODS, indent=2)
    prompt = f"""Classify these foods:
{items_str}

Return a JSON object with a key "results" containing an array of objects with id, is_simple_ingredient, and reason.
"""

    try:
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        result = json.loads(content)
        
        results_map = {r["id"]: r for r in result["results"]}
        
        for food in TEST_FOODS:
            fid = food["id"]
            res = results_map.get(fid, {})
            is_simple = res.get("is_simple_ingredient", False)
            reason = res.get("reason", "No reason")
            
            # Simple heuristic for expected
            expected = "TRUE"
            if "BURGER KING" in food["name"] or "Pizza" in food["name"] or "Sopa" in food["name"]:
                expected = "FALSE"
            
            actual = "✅ TRUE" if is_simple else "❌ FALSE"
            if not is_simple and expected == "TRUE":
                actual = "⚠️ FALSE" # Highlight failure

            print(f"{food['name']:<40} | {expected:<10} | {actual:<10} | {reason}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())
