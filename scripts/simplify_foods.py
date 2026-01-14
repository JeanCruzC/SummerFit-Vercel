
import os
import time
import json
import argparse
import asyncio
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'web', '.env.local')
load_dotenv(dotenv_path)

# Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") 
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o") 

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"{Colors.FAIL}Error: Missing Supabase credentials in .env{Colors.ENDC}")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Advanced System Prompt with "God Mode" capabilities
SYSTEM_PROMPT = """Eres el "Master Chef IA", la autoridad mundial en bases de datos de alimentos.
Tu misión no es solo traducir; es **ENRIQUECER** la base de datos para una App Fitness de clase mundial.

### TUS TAREAS PARA CADA ALIMENTO:
1.  **Simpificar Nombre (short_es)**: Nombre corto, comercial, de lista de compra (1-3 palabras).
2.  **Nombre Completo (full_es)**: Descripción natural, culinaria y apetitosa.
3.  **Detectar Categoría (culinary_category)**: "Frutas", "Verduras", "Carnes", "Lácteos", "Granos", etc.
4.  **Asignar Emoji (emoji)**: El emoji más preciso (🍊, 🥩, 🥛).
5.  **Etiquetas de Búsqueda (tags)**: 3-5 keywords PARA BÚSQUEDA (sinónimos, usos, variantes).
6.  **Análisis Dietético**: Detectar si es Vegan, Keto-Friendly, o Gluten-Free basándote en el ingrediente.

### REGLAS DE ORO:
*   ¡NADA DE TRADUCCIONES LITERALES ROBÓTICAS! "Drumstick" -> "Muslito", NO "Palillo".
*   "Navel" -> "Naranja Navel".
*   Si es una marca (ej. "Kellogg's"), mantenla.

### EJEMPLO DE RESPUESTA JSON:
IN: "Chicken, broilers or fryers, breast, meat only, cooked, roasted"
OUT: {
  "id": 123,
  "short_es": "Pechuga de Pollo",
  "full_es": "Pechuga de Pollo Asada (Sin Piel)",
  "category": "Carnes",
  "emoji": "🍗",
  "tags": ["ave", "proteina", "fit", "cena"],
  "is_vegan": false,
  "is_keto": true,
  "is_gf": true
}

Responde con un objeto JSON que contenga una clave "results": [ ... lista de objetos ... ]
"""

async def refine_batch_async(client, foods: List[Dict[str, Any]], retries=3) -> List[Dict[str, Any]]:
    """Async refinement with retry logic"""
    input_list = [{"id": f['id'], "original_name": f['name']} for f in foods]
    prompt = f"Procesa estos alimentos:\n{json.dumps(input_list, indent=2)}"

    for attempt in range(retries):
        try:
            response = await client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2, 
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            data = json.loads(content)
            
            # Flexible parsing
            if "results" in data: return data["results"]
            if "foods" in data: return data["foods"]
            if isinstance(data, list): return data
            
            # Try to find list in values
            for val in data.values():
                if isinstance(val, list): return val
                
            print(f"{Colors.WARNING}⚠️ Estructura JSON inesperada, reintentando...{Colors.ENDC}")
            
        except Exception as e:
            print(f"{Colors.FAIL}Error en intento {attempt+1}/{retries}: {e}{Colors.ENDC}")
            if attempt < retries - 1:
                await asyncio.sleep(1 + attempt)
            else:
                return []
    return []

async def process_batch(foods_batch, args):
    """Process a single batch and update DB"""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)
    except ImportError:
        print(f"{Colors.FAIL}Error: Instala openai > 1.0.0{Colors.ENDC}")
        return 0

    refined_list = await refine_batch_async(client, foods_batch)
    
    if not refined_list:
        return 0

    success_count = 0
    
    # Map for O(1) lookup
    results_map = {str(item['id']): item for item in refined_list if 'id' in item}
    
    for food in foods_batch:
        res = results_map.get(str(food['id']))
        if not res: continue

        # Extract & Clean
        full_es = res.get('full_es', '').strip()
        emoji = res.get('emoji', '')
        tags = res.get('tags', [])
        
        # Visualize
        diet_icons = ""
        if res.get('is_vegan'): diet_icons += "🌿"
        if res.get('is_keto'): diet_icons += "🥩"
        if res.get('is_gf'): diet_icons += "🌾🚫"

        print(f"  {emoji} {Colors.GREEN}{full_es}{Colors.ENDC} {diet_icons}")
        print(f"    {Colors.BLUE}Tags:{Colors.ENDC} {', '.join(tags[:3])}...")

        # Update DB using new columns
        # Note: We use a try/except because the user might not have run the migration SQL yet.
        # Check carefully if columns exist logic could be here, but simpler to just try.
        
        update_data = {
            'name_es': full_es,
            'description_es': res.get('short_es'), # Short name in description
            'emoji': emoji, 
            'search_tags': tags,
            'is_vegan': res.get('is_vegan', False),
            'is_keto': res.get('is_keto', False),
            'is_gluten_free': res.get('is_gf', False),
            'culinary_category': res.get('category')
        }

        try:
            supabase.table('foods').update(update_data).eq('id', food['id']).execute()
            success_count += 1
        except Exception as e:
            # Fallback for when columns don't exist yet (Migration check)
            # The previous attempt might have failed due to ANY missing column (emoji, tags, description_es)
            # We try to salvage at least the name translation.
            if "column" in str(e).lower() or "find the" in str(e).lower(): # Generic missing column match
                print(f"{Colors.WARNING}  ⚠️ Columnas faltantes detectadas. Guardando SOLO nombre principal...{Colors.ENDC}")
                try:
                    # Absolute minimal update
                    supabase.table('foods').update({
                        'name_es': full_es
                    }).eq('id', food['id']).execute()
                    success_count += 1
                except Exception as e3:
                    print(f"{Colors.FAIL}  Error crítico: {e3}{Colors.ENDC}")
            else:
                print(f"{Colors.FAIL}  Error DB: {e}{Colors.ENDC}")

    return success_count

async def main_async():
    parser = argparse.ArgumentParser(description="Ultimate Food AI Enricher")
    parser.add_argument("--limit", type=int, default=20000) # Default to a large number to imply "all"
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--batch", type=int, default=10)
    args = parser.parse_args()

    print(f"{Colors.HEADER}🚀 Iniciando ENRIQUECIMIENTO IA (Total Objetivo: {args.limit}){Colors.ENDC}")
    print(f"ℹ️  Asegúrate de haber ejecutado 'scripts/enhance_food_schema_advanced.sql' antes.")

    total_processed_global = 0
    current_offset = args.offset
    chunk_size = 1000 # Supabase max limit per request usually
    
    while total_processed_global < args.limit:
        print(f"\n{Colors.HEADER}📥 Descargando bloque desde índice {current_offset}...{Colors.ENDC}")
        
        # Calculate how many to fetch in this API call
        remaining = args.limit - total_processed_global
        fetch_limit = min(chunk_size, remaining)
        
        try:
            response = supabase.table('foods').select('id, name').range(current_offset, current_offset + fetch_limit - 1).execute()
            foods = response.data
        except Exception as e:
            print(f"{Colors.FAIL}Error fetching data: {e}{Colors.ENDC}")
            break

        if not foods:
            print("🏁 No hay más alimentos para procesar.")
            break

        print(f"✅ Se obtuvieron {len(foods)} items. Procesando...")

        # Process the chunk in smaller batches
        for i in range(0, len(foods), args.batch):
            batch = foods[i : i + args.batch]
            print(f"\n{Colors.BLUE}Batch {i//args.batch + 1} de este bloque ({len(batch)} items)...{Colors.ENDC}")
            count = await process_batch(batch, args)
            total_processed_global += count
            
            # Gentle rate limiting
            await asyncio.sleep(0.5)
            
        current_offset += len(foods)
        
        # If we got fewer than requests, we are done
        if len(foods) < fetch_limit:
            print("🏁 Fin de la base de datos.")
            break

    print(f"\n{Colors.HEADER}✅ ¡HECHO! {total_processed_global} alimentos enriquecidos en total.{Colors.ENDC}")

def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main()
