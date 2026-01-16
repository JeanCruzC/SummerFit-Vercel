#!/usr/bin/env python3
"""
AI Food Classifier - Production Grade
Classifies foods by meal time suitability and staple status with robust error handling.
Author: SummerFit Team
Version: 2.0.0
"""

import os
import json
import asyncio
import time
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
from enum import Enum
import re
from dataclasses import dataclass, asdict
from supabase import create_client, Client
from dotenv import load_dotenv

# ============================================================================
# CONFIGURATION
# ============================================================================

class MealTime(str, Enum):
    """Valid meal time options"""
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"

@dataclass
class ClassificationResult:
    """Validated classification result"""
    id: int
    is_simple_ingredient: bool
    is_common_staple: bool
    meal_times: List[str]
    confidence: float
    reasoning: str
    
    def validate(self) -> bool:
        """Validate that all fields are properly formatted"""
        if not 0 <= self.confidence <= 1:
            return False
        if not all(mt in [e.value for e in MealTime] for mt in self.meal_times):
            return False
        if not isinstance(self.is_simple_ingredient, bool):
            return False
        if not isinstance(self.is_common_staple, bool):
            return False
        return True

# Load environment
script_dir = Path(__file__).parent.parent
env_file = script_dir / "web" / ".env.local"
load_dotenv(env_file)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") 
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

# Processing configuration
BATCH_SIZE = int(os.getenv("AI_BATCH_SIZE", "50"))  # Optimized for GPT-4
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds
CHECKPOINT_INTERVAL = 50  # Save progress every N batches
MIN_CONFIDENCE = 0.6  # Flag low confidence results for review

# Logging setup
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"classification_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
REVIEW_FILE = LOG_DIR / f"needs_review_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
CHECKPOINT_FILE = LOG_DIR / "classification_checkpoint.json"

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in environment")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================================
# ENHANCED SYSTEM PROMPT
# ============================================================================

SYSTEM_PROMPT = """Eres un Nutricionista Experto y Chef con conocimiento internacional.

### OBJETIVO:
Clasificar alimentos para una base de datos de nutrición clínica y deportiva.
Tu trabajo es CRÍTICO: decisiones incorrectas afectan la salud de los usuarios.

### REGLAS DE CLASIFICACIÓN:

#### 1. is_simple_ingredient (Booleano ESTRICTO):
**TRUE - Ingredientes Básicos de Cocina:**
- Frutas y Verduras FRESCAS (incluyendo variedades: "Tomate Roma" ✅, "Manzana Fuji" ✅)
- Carnes, Aves, Pescados CRUDOS o COCIDOS SIMPLES (sin salsas comerciales)
- Hongos, Nueces, Semillas (crudos, tostados, secos SIN azúcar añadida)
- Lácteos BÁSICOS: Leche, Yogurt natural, Quesos simples, Mantequilla
- Granos BÁSICOS: Arroz, Avena, Pan simple, Pasta, Harina, Quinoa, Legumbres secas
- Huevos (cualquier preparación simple)
- Aceites y condimentos básicos (aceite de oliva, sal, especias puras)

**FALSE - Productos Procesados/Ultra-procesados:**
- Comida rápida de cadenas (McDonald's, Burger King, KFC, etc.)
- Platos preparados comerciales ("Lasagna congelada", "Burrito preparado")
- Sopas enlatadas, Ramen instantáneo, Comidas "listas para comer"
- Dulces, Postres, Helados, Chocolates
- Bebidas azucaradas, Jugos comerciales, Batidos proteicos comerciales
- Snacks procesados (Papas fritas, Doritos, Galletas dulces)
- Embutidos ultra-procesados (Salchichas comerciales, Nuggets procesados)

**CASOS LÍMITE:**
- "Pollo marinado casero" → TRUE (ingrediente + condimentos básicos)
- "Pollo empanizado congelado marca X" → FALSE (ultra-procesado)
- "Pan integral" → TRUE (grano básico)
- "Pan dulce glaseado" → FALSE (producto de repostería)

#### 2. is_common_staple (Booleano):
**TRUE:** Disponible en supermercados normales de Latinoamérica/España/USA
**FALSE:** Ingredientes exóticos, carnes de caza, frutas tropicales raras

#### 3. meal_times (Lista ESTRICTA):
Valores permitidos: ["breakfast", "lunch", "dinner", "snack"]

**Contexto Cultural Latino/Mediterráneo:**
- **breakfast:** Huevos, Pan, Frutas, Lácteos, Avena, Café, Cereales
- **lunch:** Proteínas fuertes, Arroces, Pastas, Legumbres, Ensaladas grandes
- **dinner:** Similar a lunch pero puede ser más ligero
- **snack:** Frutas, Nueces, Yogurt, Vegetales crudos

**IMPORTANTE:** Un ingrediente puede tener múltiples meal_times si es versátil.
Ejemplo: "Huevo" → ["breakfast", "lunch", "dinner"] (muy versátil)

#### 4. confidence (Decimal 0.0-1.0):
- 0.9-1.0: Completamente seguro (ej: "Manzana" es simple)
- 0.7-0.9: Confiado pero con pequeña duda
- 0.5-0.7: Caso límite que requiere juicio
- <0.5: Muy incierto (será revisado por humanos)

#### 5. reasoning (String corto):
Explica tu decisión en 1 frase (máximo 15 palabras).
Ejemplo: "Fruta fresca sin procesar, común en mercados"

### FORMATO DE SALIDA (JSON ESTRICTO):
{
  "results": [
    {
      "id": 123,
      "is_simple_ingredient": true,
      "is_common_staple": true,
      "meal_times": ["breakfast", "snack"],
      "confidence": 0.95,
      "reasoning": "Fruta fresca sin procesar"
    }
  ]
}

### REGLAS CRÍTICAS:
1. SIEMPRE retorna JSON válido, sin comentarios ni texto adicional
2. TODOS los campos son obligatorios
3. meal_times debe ser array no vacío
4. Usa el contexto del nombre en español (name_es) como prioritario
5. En caso de duda entre TRUE/FALSE para is_simple_ingredient, marca FALSE si tiene >3 ingredientes o procesos industriales
"""

# ============================================================================
# LOGGING UTILITIES
# ============================================================================

class Logger:
    """Structured logging for audit trail"""
    
    @staticmethod
    def log_event(event_type: str, data: Dict[str, Any]):
        """Write JSON log entry"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "data": data
        }
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    
    @staticmethod
    def log_batch_result(batch_num: int, total: int, success: int, failed: int, avg_confidence: float):
        """Log batch processing metrics"""
        Logger.log_event("batch_complete", {
            "batch": batch_num,
            "total": total,
            "success": success,
            "failed": failed,
            "avg_confidence": round(avg_confidence, 3),
            "success_rate": round(success / total * 100, 2) if total > 0 else 0
        })
    
    @staticmethod
    def log_low_confidence(food_id: int, name: str, confidence: float, reasoning: str):
        """Log items that need human review"""
        with open(REVIEW_FILE, "a", encoding="utf-8") as f:
            f.write(f"{food_id},{name},{confidence},{reasoning}\n")

# ============================================================================
# CHECKPOINT SYSTEM
# ============================================================================

class CheckpointManager:
    """Manages processing state for resume capability"""
    
    @staticmethod
    def save(processed_ids: List[int], batch_num: int):
        """Save current progress"""
        data = {
            "timestamp": datetime.now().isoformat(),
            "processed_ids": processed_ids,
            "batch_num": batch_num,
            "total_processed": len(processed_ids)
        }
        with open(CHECKPOINT_FILE, "w") as f:
            json.dump(data, f, indent=2)
    
    @staticmethod
    def load() -> Optional[Dict]:
        """Load previous checkpoint if exists"""
        if CHECKPOINT_FILE.exists():
            with open(CHECKPOINT_FILE, "r") as f:
                return json.load(f)
        return None
    
    @staticmethod
    def clear():
        """Remove checkpoint file"""
        if CHECKPOINT_FILE.exists():
            CHECKPOINT_FILE.unlink()

# ============================================================================
# AI CLASSIFICATION ENGINE
# ============================================================================

def clean_json_response(content: str) -> str:
    """Remove common LLM artifacts from JSON response"""
    # Remove markdown code blocks
    content = re.sub(r'```json\s*', '', content)
    content = re.sub(r'```\s*', '', content)
    # Remove comments (// or /* */)
    content = re.sub(r'//.*?\n', '\n', content)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    return content.strip()

def validate_classification(raw_result: Dict, food_id: int) -> Optional[ClassificationResult]:
    """Validate and parse AI response into structured result"""
    try:
        # Extract and validate fields
        result = ClassificationResult(
            id=raw_result.get("id", food_id),
            is_simple_ingredient=bool(raw_result.get("is_simple_ingredient", False)),
            is_common_staple=bool(raw_result.get("is_common_staple", False)),
            meal_times=raw_result.get("meal_times", []),
            confidence=float(raw_result.get("confidence", 0.0)),
            reasoning=str(raw_result.get("reasoning", "No reasoning provided"))[:200]
        )
        
        if not result.validate():
            Logger.log_event("validation_error", {
                "food_id": food_id,
                "error": "Validation failed",
                "data": raw_result
            })
            return None
        
        return result
    
    except Exception as e:
        Logger.log_event("validation_error", {
            "food_id": food_id,
            "error": str(e),
            "data": raw_result
        })
        return None

async def classify_batch_with_retry(client, foods: List[Dict], attempt: int = 1) -> Optional[Dict]:
    """Classify batch with exponential backoff retry"""
    items_str = json.dumps([
        {"id": f["id"], "name": f["name_es"] or f["name"]} 
        for f in foods
    ], indent=2, ensure_ascii=False)
    
    prompt = f"""Classify these {len(foods)} foods following the rules exactly.
Remember: Return ONLY valid JSON, no additional text.

Foods to classify:
{items_str}"""

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
        cleaned = clean_json_response(content)
        result = json.loads(cleaned)
        
        # Validate structure
        if "results" not in result or not isinstance(result["results"], list):
            raise ValueError("Invalid response structure: missing 'results' array")
        
        Logger.log_event("api_success", {
            "batch_size": len(foods),
            "attempt": attempt,
            "results_count": len(result.get("results", []))
        })
        
        return result
    
    except json.JSONDecodeError as e:
        Logger.log_event("json_parse_error", {
            "attempt": attempt,
            "error": str(e),
            "content_preview": content[:200] if 'content' in locals() else "No content"
        })
        
        if attempt < MAX_RETRIES:
            await asyncio.sleep(RETRY_DELAY * attempt)
            return await classify_batch_with_retry(client, foods, attempt + 1)
        return None
    
    except Exception as e:
        Logger.log_event("api_error", {
            "attempt": attempt,
            "error": str(e),
            "error_type": type(e).__name__
        })
        
        if attempt < MAX_RETRIES:
            await asyncio.sleep(RETRY_DELAY * attempt)
            return await classify_batch_with_retry(client, foods, attempt + 1)
        return None

# ============================================================================
# DATABASE OPERATIONS
# ============================================================================

def update_food_classification(food_id: int, classification: ClassificationResult) -> bool:
    """Update single food in database with error handling"""
    try:
        supabase.table('foods').update({
            'meal_times': classification.meal_times,
            'is_common_staple': classification.is_common_staple,
            'is_simple_ingredient': classification.is_simple_ingredient,
            'ai_confidence': classification.confidence,
            'ai_reasoning': classification.reasoning,
            'classified_at': datetime.now().isoformat()
        }).eq('id', food_id).execute()
        
        return True
    
    except Exception as e:
        Logger.log_event("db_error", {
            "food_id": food_id,
            "error": str(e)
        })
        return False

def fetch_all_foods(skip_processed: bool = True) -> List[Dict]:
    """Fetch foods from database with pagination"""
    all_foods = []
    offset = 0
    limit = 1000
    
    print(f"📥 Fetching foods from database...")
    
    while True:
        try:
            query = supabase.table('foods').select('id, name, name_es, is_simple_ingredient')
            
            # Skip already classified if requested
            if skip_processed:
                query = query.is_('classified_at', 'null')
            
            response = query.range(offset, offset + limit - 1).execute()
            data = response.data
            
            if not data:
                break
            
            all_foods.extend(data)
            print(f"   Fetched {len(all_foods)} foods...")
            
            if len(data) < limit:
                break
            
            offset += limit
        
        except Exception as e:
            Logger.log_event("fetch_error", {"offset": offset, "error": str(e)})
            break
    
    return all_foods

# ============================================================================
# MAIN PROCESSING PIPELINE
# ============================================================================

async def main(dry_run: bool = False, force_reprocess: bool = False):
    """Main processing pipeline with all safeguards"""
    
    print("=" * 70)
    print("🍎 AI FOOD CLASSIFIER - Production Grade v2.0")
    print("=" * 70)
    print(f"📅 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🤖 Model: {OPENAI_MODEL}")
    print(f"🌐 Base URL: {OPENAI_BASE_URL}")
    print(f"📦 Batch Size: {BATCH_SIZE}")
    print(f"🔄 Max Retries: {MAX_RETRIES}")
    print(f"💾 Dry Run: {'YES - No DB writes' if dry_run else 'NO - Will update DB'}")
    print(f"🔁 Reprocess All: {'YES' if force_reprocess else 'NO - Skip processed'}")
    print("-" * 70)
    
    # Initialize OpenAI client
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)
    except ImportError:
        print("❌ ERROR: OpenAI library not installed")
        print("   Run: pip install openai")
        return
    
    # Check for checkpoint
    checkpoint = CheckpointManager.load()
    processed_ids = set(checkpoint["processed_ids"]) if checkpoint else set()
    
    if checkpoint and not force_reprocess:
        print(f"📍 Checkpoint found: {len(processed_ids)} foods already processed")
        print(f"   Resuming from batch {checkpoint['batch_num']}")
    
    # Fetch foods
    all_foods = fetch_all_foods(skip_processed=not force_reprocess)
    
    if not all_foods:
        print("✅ No foods to process!")
        return
    
    # Filter out already processed (from checkpoint)
    if processed_ids and not force_reprocess:
        all_foods = [f for f in all_foods if f['id'] not in processed_ids]
    
    total_foods = len(all_foods)
    total_batches = (total_foods + BATCH_SIZE - 1) // BATCH_SIZE
    
    print(f"📊 Found {total_foods} foods to classify")
    print(f"📦 Will process in {total_batches} batches")
    print("=" * 70)
    
    # Initialize review file
    with open(REVIEW_FILE, "w", encoding="utf-8") as f:
        f.write("food_id,name,confidence,reasoning\n")
    
    # Statistics
    stats = {
        "total": 0,
        "success": 0,
        "failed": 0,
        "low_confidence": 0,
        "simple": 0,
        "complex": 0
    }
    
    # Process batches
    for batch_idx in range(0, total_foods, BATCH_SIZE):
        batch_num = batch_idx // BATCH_SIZE + 1
        batch = all_foods[batch_idx:batch_idx + BATCH_SIZE]
        
        print(f"\n🔄 Batch {batch_num}/{total_batches} ({len(batch)} foods)...")
        
        # Classify batch
        result = await classify_batch_with_retry(client, batch)
        
        if not result or "results" not in result:
            print(f"   ❌ Batch failed after {MAX_RETRIES} retries")
            stats["failed"] += len(batch)
            continue
        
        # Process results
        results_map = {r.get("id"): r for r in result["results"] if r.get("id")}
        batch_success = 0
        batch_confidence = []
        
        for food in batch:
            food_id = food["id"]
            food_name = food["name_es"] or food["name"]
            
            if food_id not in results_map:
                print(f"   ⚠️  Missing result for: {food_name}")
                stats["failed"] += 1
                continue
            
            # Validate classification
            classification = validate_classification(results_map[food_id], food_id)
            
            if not classification:
                print(f"   ❌ Invalid result for: {food_name}")
                stats["failed"] += 1
                continue
            
            # Track statistics
            stats["total"] += 1
            batch_confidence.append(classification.confidence)
            
            if classification.is_simple_ingredient:
                stats["simple"] += 1
                icon = "✅"
            else:
                stats["complex"] += 1
                icon = "❌"
            
            # Flag low confidence
            if classification.confidence < MIN_CONFIDENCE:
                stats["low_confidence"] += 1
                Logger.log_low_confidence(
                    food_id, food_name, 
                    classification.confidence, 
                    classification.reasoning
                )
                icon += " ⚠️"
            
            # Update database (unless dry run)
            if not dry_run:
                if update_food_classification(food_id, classification):
                    stats["success"] += 1
                    batch_success += 1
                    processed_ids.add(food_id)
                else:
                    stats["failed"] += 1
                    print(f"   ❌ DB update failed for: {food_name}")
            else:
                stats["success"] += 1
                batch_success += 1
            
            # Calculate global progress
            current_idx = batch_idx + batch.index(food) + 1
            percent = (current_idx / total_foods) * 100
            
            # Print result with Percentage
            conf_str = f"{classification.confidence:.2f}"
            print(f"[{percent:5.1f}%] {icon} {food_name[:35]:35} | Conf: {conf_str} | {classification.reasoning[:25]}")
        
        # Log batch metrics
        avg_conf = sum(batch_confidence) / len(batch_confidence) if batch_confidence else 0
        Logger.log_batch_result(batch_num, len(batch), batch_success, len(batch) - batch_success, avg_conf)
        
        # Save checkpoint
        if batch_num % CHECKPOINT_INTERVAL == 0 and not dry_run:
            CheckpointManager.save(list(processed_ids), batch_num)
            print(f"   💾 Checkpoint saved")
        
        # Rate limiting
        await asyncio.sleep(0.3)
    
    # Final statistics
    print("\n" + "=" * 70)
    print("📊 FINAL STATISTICS")
    print("=" * 70)
    print(f"Total Processed:     {stats['total']}")
    print(f"✅ Success:          {stats['success']} ({stats['success']/stats['total']*100:.1f}%)")
    print(f"❌ Failed:           {stats['failed']}")
    print(f"⚠️  Low Confidence:   {stats['low_confidence']} (review needed)")
    print(f"🥗 Simple:           {stats['simple']} ({stats['simple']/stats['total']*100:.1f}%)")
    print(f"🍕 Complex:          {stats['complex']} ({stats['complex']/stats['total']*100:.1f}%)")
    print("-" * 70)
    print(f"📝 Full log:         {LOG_FILE}")
    print(f"👀 Review needed:    {REVIEW_FILE}")
    
    # Clear checkpoint on success
    if not dry_run and stats["failed"] == 0:
        CheckpointManager.clear()
        print("✅ Checkpoint cleared (all done!)")
    
    print("=" * 70)

# ============================================================================
# CLI ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import sys
    
    # Parse CLI arguments
    dry_run = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    
    if "--help" in sys.argv:
        print("""
AI Food Classifier - Usage:

python ai_classify_foods.py [OPTIONS]

OPTIONS:
  --dry-run       Preview results without writing to database
  --force         Reprocess all foods (ignore checkpoint and classified_at)
  --help          Show this help message

EXAMPLES:
  python ai_classify_foods.py --dry-run    # Test run
  python ai_classify_foods.py              # Normal run
  python ai_classify_foods.py --force      # Reprocess everything
        """)
        sys.exit(0)
    
    asyncio.run(main(dry_run=dry_run, force_reprocess=force))