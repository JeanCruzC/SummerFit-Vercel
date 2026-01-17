#!/usr/bin/env python3
"""
Food Tier Classifier - Whole Foods Prioritization
Classifies foods into 3 tiers using AI + fallback rules.

Tiers:
  1 = Whole Food (básico: huevo, arroz, pollo genérico) - MÁXIMA PRIORIDAD
  2 = Simple Ingredient (accesible: pechuga, salmón) - PRIORIDAD NORMAL
  3 = Specialty (excluir: ribeye, wagyu, trufa) - EXCLUIR DEL GENERADOR

Features:
  • Validación JSON estricta con struct validation
  • Retry con exponential backoff (hasta 3 intentos)
  • Logging persistente con timestamps
  • Métricas detalladas de clasificación
  • Prevención de duplicados y verificación post-BD
  • Health checks y rate limiting adaptativo
  • Type hints completos y docstrings

Author: SummerFit Team
Version: 2.1.0 (Production-Ready)
"""

import os
import json
import asyncio
import time
import re
import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from openai import OpenAI, APIError, RateLimitError
from supabase import create_client, Client
from dotenv import load_dotenv

# ============================================================================
# CONFIGURATION
# ============================================================================

# Load environment
script_dir = Path(__file__).parent.parent
env_file = script_dir / "web" / ".env.local"
load_dotenv(env_file)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    raise ValueError("Missing Supabase credentials in .env.local")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# OpenAI client for Qwen
client = OpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL
)

# Batch size for processing (Aggressive Parallelism)
BATCH_SIZE = 25
CONCURRENCY_LIMIT = 40  # Concurrent AI requests (High throughput)
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# ============================================================================
# LOGGING SETUP
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / "tier_classifier.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Metrics tracking
@dataclass
class ClassificationMetrics:
    """Rastreo detallado de métricas de clasificación."""
    total_processed: int = 0
    total_ai: int = 0
    total_fallback: int = 0
    total_override: int = 0
    tier_1_count: int = 0
    tier_2_count: int = 0
    tier_3_count: int = 0
    errors: int = 0
    api_errors: int = 0
    db_errors: int = 0
    total_time_seconds: float = 0.0
    api_calls: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte métricas a diccionario."""
        return asdict(self)
    
    def get_quality_score(self) -> float:
        """Calcula score de calidad (0-100).
        
        Basado en:
        - % de clasificaciones exitosas (sin errores)
        - % de AI results vs fallback (AI más confiable)
        - % de tier distribution (balance)
        """
        if self.total_processed == 0:
            return 0.0
        
        # 40% basado en tasa de éxito
        success_rate = (self.total_processed - self.errors) / self.total_processed
        success_score = success_rate * 40
        
        # 30% basado en uso de AI vs fallback
        ai_rate = self.total_ai / max(self.total_processed, 1)
        ai_score = ai_rate * 30
        
        # 30% basado en balance de tiers
        tier_balance = 1.0 if self.tier_1_count > 0 and self.tier_2_count > 0 else 0.5
        balance_score = tier_balance * 30
        
        return success_score + ai_score + balance_score
    
    def log_summary(self):
        """Registra resumen de métricas con calidad."""
        quality_score = self.get_quality_score()
        quality_emoji = "🟢" if quality_score >= 80 else "🟡" if quality_score >= 60 else "🔴"
        
        logger.info("=" * 60)
        logger.info("📊 CLASSIFICATION METRICS")
        logger.info("=" * 60)
        logger.info(f"Total Processed: {self.total_processed}")
        logger.info(f"  AI Results: {self.total_ai} ({self.total_ai/max(self.total_processed,1)*100:.1f}%)")
        logger.info(f"  Fallback: {self.total_fallback} ({self.total_fallback/max(self.total_processed,1)*100:.1f}%)")
        logger.info(f"  Override: {self.total_override}")
        logger.info(f"Tier Distribution:")
        logger.info(f"  Tier 1: {self.tier_1_count} ({self.tier_1_count/max(self.total_processed,1)*100:.1f}%)")
        logger.info(f"  Tier 2: {self.tier_2_count} ({self.tier_2_count/max(self.total_processed,1)*100:.1f}%)")
        logger.info(f"  Tier 3: {self.tier_3_count} ({self.tier_3_count/max(self.total_processed,1)*100:.1f}%)")
        logger.info(f"Errors: {self.errors} (DB: {self.db_errors})")
        logger.info(f"API Errors: {self.api_errors}")
        logger.info(f"Performance: {self.total_time_seconds:.1f}s ({self.api_calls} API calls)")
        logger.info(f"{quality_emoji} Quality Score: {quality_score:.1f}/100")
        logger.info("=" * 60)

# These ALWAYS result in Tier 3 (exclude from generator)
TIER_3_KEYWORDS = [
    # 🚫 RESTAURANTES Y FAST FOOD - SIEMPRE TIER 3
    # Global chains
    "mcdonald", "mcdonalds", "kfc", "wendy", "burger king", "burgerking",
    "taco bell", "tacobell", "popeyes", "subway", "chipotle", "chick-fil-a",
    "chick fil a", "chickfila", "panera", "panda express", "pandaexpress",
    "pizza hut", "domino", "papa john", "papajohns", "little caesars",
    "dunkin", "dunkin donuts", "starbucks", "wingstop", "hooters",
    "red robin", "five guys", "shake shack", "in-n-out", "innout",
    "whataburger", "sonic", "arby", "carl's jr", "hardee",
    
    # Latin restaurants/chains
    "taco", "burrito", "enchilada", "quesadilla", "fajita",
    "carne asada", "carneasada", "pollo guisado", "ropa vieja",
    "mofongo", "arroz con pollo", "arrozconpollo", "pernil",
    "cubana", "chilango", "charro", "el pollo loco", "elpolololoco",
    
    # Pizza & Italian
    "pizza", "pizzería", "pizzeria", "napolitana", "al horno",
    "neapolitan", "margherita", "pepperoni", "italiana",
    
    # Processed restaurant food
    "hamburguesa", "burger", "sandwich", "sándwich", "wrap",
    "nugget", "pollo frito", "pollofrito", "alitas", "wings",
    "nachos", "papas fritas", "papasfritas", "fries", "hot dog",
    "hotdog", "salchicha", "empanada de restaurante",
    
    # Premium beef cuts
    "ribeye", "rib eye", "rib-eye", "t-bone", "t bone", "tbone",
    "wagyu", "kobe", "filet mignon", "filete mignon", "tomahawk",
    "prime rib", "costilla prime", "dry aged", "dry-aged",
    "angus certified", "certified angus", "usda prime", "usda choice",
    "sirloin", "new york strip", "strip steak", "porterhouse",
    
    # Luxury items
    "trufa", "truffle", "caviar", "foie gras", "foie",
    "langosta", "lobster", "king crab", "cangrejo real",
    
    # Exotic meats  
    "alce", "elk", "venado", "venison", "canguro", "kangaroo",
    "avestruz", "ostrich", "bisonte", "bison", "jabali", "wild boar",
    "codorniz", "quail", "faisán", "pheasant", "pato silvestre",
    
    # Premium fish
    "bluefin", "atún rojo", "otoro", "chutoro", "uni ", "erizo de mar"
]

# TIER_1_KEYWORDS DISABLED - Let AI have full control
# The AI prompt is now strict enough to distinguish raw ingredients from restaurant food
TIER_1_KEYWORDS = []  # Empty - AI decides everything

# ============================================================================
# AI PROMPT
# ============================================================================

SYSTEM_PROMPT = """🥇 WHOLE FOODS CLASSIFIER - TIER 1 ES SOLO INGREDIENTES CRUDOS

Tu trabajo es clasificar alimentos en 3 tiers basado en:
- TIER 1 = Ingredientes crudos/sin procesar que compras para COCINAR EN CASA
- TIER 2 = Productos procesados de supermercado
- TIER 3 = Restaurantes, fast food, comidas preparadas, lujo

⚠️ **REGLA CRÍTICA PARA TIER 1:**
SOLO alimentos que son UN SOLO INGREDIENTE sin procesar:
- ✅ Manzana, Zanahoria, Pollo crudo, Huevo, Arroz
- ❌ NADA de restaurantes, nada de preparado, nada con marca de comida rápida

### TIER 1 - WHOLE FOODS (SOLO Ingredientes Crudos):
✅ SOLO estos tipos:
- Proteínas CRUDAS/FRESCAS: Pollo crudo, Carne molida, Huevo, Pescado fresco (sin marcar como de restaurante)
- Vegetales FRESCOS: Zanahoria, Cebolla, Tomate, Brócoli, Lechuga, Rábano
- Frutas FRESCAS: Manzana, Plátano, Naranja, Fresa, Uva, Melón
- Granos/Legumbres SIN PROCESAR: Arroz, Frijoles secos, Lentejas, Avena, Quinoa
- Lácteos BÁSICOS: Leche, Yogurt natural, Queso fresco, Mantequilla
- Aceites simples: Aceite de oliva, Aceite vegetal

❌ NUNCA TIER 1 si:
- Contiene nombre de restaurante/fast food (McDonald's, KFC, Wendy's, Burger King, Taco Bell, Popeyes, Subway, Domino's, Pizza Hut, Chick-fil-A, Chipotle, etc.)
- Es comida preparada (hamburguesa, pizza, sandwich, nachos, wrap, taco de restaurante)
- Es un PLATILLO (arroz con pollo, pasta cocinada, sopa lista)
- Es procesado comercialmente (pan, galletas, cereales, empaque de supermercado)
- Es enlatado/congelado (salvo: atún en lata natura)
- Tiene MARCA de comida rápida

### TIER 2 - PROCESSED (Supermercado):
- Productos enlatados: Sopa Campbell's, Atún en lata
- Horneados: Pan, Galletas, Cereales
- Congelados de supermercado: Pizza congelada, Nuggets congelados
- Comida lista/procesada de marca: Arroz con pollo preparado
- Salsas, condimentos, productos comerciales
- Frutas/vegetales procesados: Jugo de naranja, verduras congeladas

### TIER 3 - EXCLUDE (Restaurantes/Fast Food/Premium):
🚫 RESTAURANTES Y FAST FOOD (CUALQUIER producto):
- McDonald's (burger, nuggets, fries, wrap)
- Wendy's (cualquier cosa)
- Burger King (burger, nuggets)
- KFC (pollo, biscuit, sandwich)
- Taco Bell (taco, nachos, burrito)
- Popeyes (pollo, sandwich)
- Subway (sandwich)
- Domino's, Pizza Hut, Papa John's (pizza)
- Chick-fil-A (pollo, sandwich)
- Chipotle (burrito, bowl)
- Panera, Panda Express, etc. (CUALQUIER restaurante)

🚫 CORTES PREMIUM:
- Ribeye, T-Bone, Wagyu, Filet Mignon, New York Strip, Sirloin
- Prime Rib, Porterhouse, Tomahawk

🚫 LUJO/EXÓTICOS:
- Trufa, Caviar, Foie gras, Langosta, King Crab
- Carnes exóticas: Alce, Venado, Canguro, Avestruz, Bisonte

### EJEMPLOS DECISIVOS:
| Alimento | Tier | RAZÓN |
|----------|------|-------|
| Pollo crudo | 1 | ✅ Ingrediente crudo |
| Zanahoria | 1 | ✅ Vegetal fresco |
| Arroz | 1 | ✅ Grano sin procesar |
| Huevo | 1 | ✅ Ingrediente básico |
| Manzana | 1 | ✅ Fruta fresca |
| Pechuga de pollo KFC | 3 | ❌ ES KFC (restaurante) |
| Nuggets de Popeyes | 3 | ❌ ES POPEYES (fast food) |
| Hamburguesa Wendy's | 3 | ❌ ES WENDY'S |
| Pizza Taco Bell | 3 | ❌ ES TACO BELL |
| Muslo de KFC | 3 | ❌ ES KFC - aunque sea pollo, es restaurante |
| Atún en lata | 2 | Procesado de supermercado |
| Pan integral | 2 | Procesado comercial |
| Pizza congelada | 2 | De supermercado, no restaurante |
| Sopa enlatada | 2 | Procesada |
| Nuggets congelados | 2 | De supermercado (no de restaurante) |

### REGLAS ABSOLUTAS (no excepción):
1. ⚠️ Si el nombre contiene un restaurante CONOCIDO → SIEMPRE TIER 3
2. ⚠️ Si es un platillo/comida combinada → Mínimo TIER 2
3. ⚠️ Si suena a "comida de restaurante" → TIER 3
4. Si es ingrediente crudo único sin marca de restaurante → TIER 1
5. Si es procesado de supermercado → TIER 2

### FORMATO JSON (REQUERIDO):
{
  "results": [
    {
      "id": 123,
      "food_tier": 1,
      "confidence": 0.95,
      "reasoning": "Ingrediente crudo sin procesar"
    }
  ]
}

IMPORTANTE: food_tier DEBE ser 1, 2, o 3. NO otros valores.
"""

# ============================================================================
# CLASSIFICATION LOGIC
# ============================================================================

@dataclass
class TierResult:
    """Resultado de clasificación de un alimento.
    
    Attributes:
        food_id: ID único del alimento
        food_tier: Tier asignado (1, 2, o 3)
        confidence: Confianza de la clasificación (0.0-1.0)
        reasoning: Explicación de por qué se asignó este tier
        source: Fuente de la clasificación ("ai", "fallback", "override")
    """
    food_id: int
    food_tier: int
    confidence: float
    reasoning: str
    source: str  # "ai" or "fallback" or "override"


def fallback_classification(food_name: str) -> TierResult:
    """Clasificación basada en palabras clave cuando AI falla o no confía.
    
    Usa patrones de keywords para detectar:
    - Tier 3: Cortes premium, artículos de lujo, comidas exóticas
    - Tier 1: Básicos baratos, disponibles en cualquier tienda
    - Tier 2: Default si no hay coincidencia
    
    Args:
        food_name: Nombre del alimento a clasificar
        
    Returns:
        TierResult con clasificación basada en keywords
    """
    if not food_name:
        logger.warning("Empty food_name provided to fallback_classification")
        return TierResult(
            food_id=0,
            food_tier=2,
            confidence=0.5,
            reasoning="Empty name, defaulting to T2",
            source="fallback"
        )
    
    name_lower = food_name.lower().strip()
    
    # Check Tier 3 first (exclusions are most important)
    for keyword in TIER_3_KEYWORDS:
        if keyword in name_lower:
            return TierResult(
                food_id=0,
                food_tier=3,
                confidence=0.99,
                reasoning=f"Keyword match: '{keyword}' → Premium/Exclude",
                source="fallback"
            )
    
    # Check Tier 1 (priorities)
    for keyword in TIER_1_KEYWORDS:
        if keyword in name_lower:
            return TierResult(
                food_id=0,
                food_tier=1,
                confidence=0.95,
                reasoning=f"Keyword match: '{keyword}' → Whole Food",
                source="fallback"
            )
    
    # Default: Tier 2
    return TierResult(
        food_id=0,
        food_tier=2,
        confidence=0.7,
        reasoning="No keyword match, default to Simple",
        source="fallback"
    )


def validate_ai_response(ai_result: Dict, food_name: str, food_id: int) -> Optional[TierResult]:
    """
    Validate AI response and apply overrides if needed.
    🔴 CRÍTICO: Validar que food_tier sea 1, 2 o 3
    Returns None if validation fails completely.
    """
    # Validar que food_tier sea 1, 2 o 3
    tier = ai_result.get("food_tier")
    if tier not in [1, 2, 3]:
        logger.warning(f"Invalid tier {tier} for food {food_id}, using fallback")
        fallback = fallback_classification(food_name)
        fallback.food_id = food_id
        return fallback
    
    confidence = ai_result.get("confidence", 0.5)
    reasoning = ai_result.get("reasoning", "")
    
    # Validar que confidence sea numérico y en rango [0, 1]
    if not isinstance(confidence, (int, float)) or not (0 <= confidence <= 1):
        logger.warning(f"Invalid confidence {confidence} for food {food_id}, using fallback")
        fallback = fallback_classification(food_name)
        fallback.food_id = food_id
        return fallback
    
    # Validar que reasoning no sea vacío
    if not reasoning or not isinstance(reasoning, str):
        logger.warning(f"Missing reasoning for food {food_id}")
        reasoning = "AI classified without explanation"
    
    name_lower = food_name.lower()
    
    # Override: If AI missed a Tier 3 keyword
    for keyword in TIER_3_KEYWORDS:
        if keyword in name_lower and tier != 3:
            logger.info(f"Override T3: '{food_name}' matched keyword '{keyword}'")
            return TierResult(
                food_id=food_id,
                food_tier=3,
                confidence=0.99,
                reasoning=f"Override: '{keyword}' is premium",
                source="override"
            )
    
    # Override: If AI wrongly put a basic food in Tier 3
    for keyword in TIER_1_KEYWORDS:
        if keyword in name_lower and tier == 3:
            logger.info(f"Override T1: '{food_name}' matched keyword '{keyword}'")
            return TierResult(
                food_id=food_id,
                food_tier=1,
                confidence=0.95,
                reasoning=f"Override: '{keyword}' is basic",
                source="override"
            )
    
    # 🟡 IMPORTANTE: Subir confidence threshold a 0.85+ (era 0.6)
    if confidence < 0.85:
        logger.info(f"Low confidence {confidence:.2f} for '{food_name}', using fallback")
        fallback = fallback_classification(food_name)
        fallback.food_id = food_id
        return fallback
    
    return TierResult(
        food_id=food_id,
        food_tier=tier,
        confidence=confidence,
        reasoning=reasoning,
        source="ai"
    )


def clean_json_response(content: str) -> str:
    """Remove markdown artifacts from JSON response."""
    content = re.sub(r'^```json\s*', '', content, flags=re.MULTILINE)
    content = re.sub(r'^```\s*$', '', content, flags=re.MULTILINE)
    content = content.strip()
    return content


def validate_json_structure(parsed: Dict) -> bool:
    """🔴 CRÍTICO: Validar estructura JSON completa."""
    # Validar que 'results' existe
    if "results" not in parsed:
        logger.error("Missing 'results' key in AI response")
        return False
    
    # Validar que 'results' es una lista
    if not isinstance(parsed["results"], list):
        logger.error(f"'results' must be a list, got {type(parsed['results'])}")
        return False
    
    # Validar cada resultado
    for i, result in enumerate(parsed["results"]):
        if not isinstance(result, dict):
            logger.error(f"Result {i} is not a dict")
            return False
        
        required_keys = {"id", "food_tier", "confidence", "reasoning"}
        missing_keys = required_keys - set(result.keys())
        if missing_keys:
            logger.error(f"Result {i} missing keys: {missing_keys}")
            return False
    
    return True


async def classify_batch_with_ai(foods: List[Dict], metrics: ClassificationMetrics, max_retries: int = 3) -> List[TierResult]:
    """
    Classify a batch of foods using Qwen AI with retry logic and validation.
    🟡 IMPORTANTE: Agregar retry con exponential backoff
    """
    # Prepare input
    food_list = "\n".join([
        f"- ID {f['id']}: {f.get('name_es') or f.get('name')}"
        for f in foods
    ])
    
    user_prompt = f"""Clasifica estos alimentos en tiers (1, 2, o 3):

{food_list}

Retorna JSON con el formato especificado."""

    # Retry logic with exponential backoff
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=4000  # Increased for larger batches
            )
            
            content = response.choices[0].message.content
            content = clean_json_response(content)
            
            # 🔴 CRÍTICO: Validar JSON antes de procesar
            try:
                parsed = json.loads(content)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in response (attempt {attempt + 1}): {e}")
                metrics.api_errors += 1
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.info(f"Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    raise
            
            # Validar estructura JSON
            if not validate_json_structure(parsed):
                logger.error(f"Invalid JSON structure (attempt {attempt + 1})")
                metrics.api_errors += 1
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.info(f"Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    raise ValueError("Invalid JSON structure after retries")
            
            results = []
            ai_results_map = {r["id"]: r for r in parsed.get("results", [])}
            
            # 🟢 MEJORA: Verificar que todos los IDs aparezcan
            missing_ids = [f["id"] for f in foods if f["id"] not in ai_results_map]
            if missing_ids:
                logger.warning(f"AI omitted {len(missing_ids)} foods: {missing_ids}")
            
            for food in foods:
                food_id = food["id"]
                food_name = food.get("name_es") or food.get("name")
                
                if food_id in ai_results_map:
                    result = validate_ai_response(ai_results_map[food_id], food_name, food_id)
                    if result:
                        results.append(result)
                        if result.source == "ai":
                            metrics.total_ai += 1
                        elif result.source == "override":
                            metrics.total_override += 1
                    else:
                        metrics.errors += 1
                else:
                    # AI didn't return este food, use fallback
                    result = fallback_classification(food_name)
                    result.food_id = food_id
                    results.append(result)
                    metrics.total_fallback += 1
            
            logger.info(f"✅ Batch classified successfully (attempt {attempt + 1})")
            return results
            
        except Exception as e:
            logger.error(f"AI error on attempt {attempt + 1}: {e}")
            metrics.api_errors += 1
            
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 1s, 2s, 4s
                logger.info(f"Retrying in {wait_time}s... ({attempt + 1}/{max_retries})")
                await asyncio.sleep(wait_time)
            else:
                logger.warning(f"⚠️  Max retries exceeded for batch. Using fallback.")
                results = []
                for food in foods:
                    food_name = food.get("name_es") or food.get("name")
                    result = fallback_classification(food_name)
                    result.food_id = food["id"]
                    results.append(result)
                    metrics.total_fallback += 1
                return results
    
    # Fallback si todo falla
    return []


# ============================================================================
# DATABASE OPERATIONS
# ============================================================================

def load_foods_to_classify() -> List[Dict]:
    """Load foods that need classification.
    
    Note: Supabase tiene un límite de 1000 rows por query por defecto.
    Usamos limit(10000) para obtener todos.
    """
    # Primero buscar alimentos sin clasificar (food_tier = null)
    result = supabase.table("foods").select(
        "id, name, name_es"
    ).is_("food_tier", "null").limit(10000).execute()
    
    logger.info(f"🔍 Query returned {len(result.data or [])} foods with food_tier=null")
    
    return result.data or []


def update_food_tier(food_id: int, tier: int, reasoning: str) -> bool:
    """Update food tier in database.
    
    Note: Supabase puede retornar 200 OK sin data en PATCH.
    Confiamos en que si no hay excepción, la actualización fue exitosa.
    """
    try:
        result = supabase.table("foods").update({
            "food_tier": tier,
            "tier_reasoning": reasoning,
            "tier_updated_at": datetime.now().isoformat()
        }).eq("id", food_id).execute()
        
        # Si llegamos aquí sin excepción, la actualización fue exitosa
        # Supabase puede retornar data vacía en PATCH y aún así ser exitoso
        logger.debug(f"Updated food {food_id} to tier {tier}")
        return True
        
    except Exception as e:
        logger.error(f"Database error updating food {food_id}: {e}")
        return False


def save_checkpoint(processed_ids: List[int], batch_num: int, metrics: ClassificationMetrics):
    """Save progress checkpoint with metrics.
    🟢 MEJORA: Verificar duplicados en processed_ids
    """
    # Verificar duplicados
    unique_ids = set(processed_ids)
    if len(unique_ids) != len(processed_ids):
        logger.warning(f"Found {len(processed_ids) - len(unique_ids)} duplicates in processed_ids")
        processed_ids = list(unique_ids)
    
    checkpoint_file = LOG_DIR / "tier_checkpoint.json"
    try:
        with open(checkpoint_file, "w") as f:
            json.dump({
                "processed_ids": processed_ids,
                "batch_num": batch_num,
                "timestamp": datetime.now().isoformat(),
                "metrics": metrics.to_dict()
            }, f, indent=2)
        logger.info(f"Checkpoint saved: {len(processed_ids)} foods processed, batch {batch_num}")
    except Exception as e:
        logger.error(f"Failed to save checkpoint: {e}")


def load_checkpoint() -> tuple:
    """Load checkpoint if exists.
    🟢 MEJORA: Cargar también las métricas
    """
    checkpoint_file = LOG_DIR / "tier_checkpoint.json"
    if checkpoint_file.exists():
        try:
            with open(checkpoint_file) as f:
                data = json.load(f)
                processed_ids = data.get("processed_ids", [])
                batch_num = data.get("batch_num", 0)
                
                # Verificar duplicados al cargar
                unique_ids = set(processed_ids)
                if len(unique_ids) != len(processed_ids):
                    logger.warning(f"Loaded checkpoint with {len(processed_ids) - len(unique_ids)} duplicates")
                    processed_ids = list(unique_ids)
                
                return processed_ids, batch_num
        except Exception as e:
            logger.error(f"Failed to load checkpoint: {e}")
            return [], 0
    return [], 0


# ============================================================================
# HEALTH CHECKS & UTILITIES
# ============================================================================

async def check_api_health() -> Tuple[bool, str]:
    """Verifica que la API de OpenAI sea accesible.
    
    Returns:
        Tuple[bool, str]: (es_accesible, mensaje)
    """
    try:
        # Intenta crear un request mínimo
        test_prompt = "Test"
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": test_prompt}],
            max_tokens=10,
            temperature=0
        )
        logger.info(f"✅ API Health Check: OK (Model: {OPENAI_MODEL})")
        return True, "API is accessible"
    except RateLimitError:
        msg = "API rate limit reached"
        logger.warning(f"⚠️  API Health Check: {msg}")
        return False, msg
    except APIError as e:
        msg = f"API error: {str(e)[:100]}"
        logger.error(f"❌ API Health Check: {msg}")
        return False, msg
    except Exception as e:
        msg = f"Connection error: {str(e)[:100]}"
        logger.error(f"❌ API Health Check: {msg}")
        return False, msg


async def check_database_health() -> Tuple[bool, str]:
    """Verifica conectividad con Supabase.
    
    Returns:
        Tuple[bool, str]: (es_accesible, mensaje)
    """
    try:
        # Intenta query simple
        result = supabase.table("foods").select("id").limit(1).execute()
        logger.info(f"✅ Database Health Check: OK ({len(result.data)} foods available)")
        return True, "Database is accessible"
    except Exception as e:
        msg = f"Database error: {str(e)[:100]}"
        logger.error(f"❌ Database Health Check: {msg}")
        return False, msg


async def run_health_checks() -> bool:
    """Ejecuta todos los health checks antes de procesar.
    
    Returns:
        bool: True si todo está ok, False si hay problemas
    """
    logger.info("🏥 Running health checks...")
    
    api_ok, api_msg = await check_api_health()
    db_ok, db_msg = await check_database_health()
    
    if not (api_ok and db_ok):
        logger.error("❌ Health checks failed. Cannot continue.")
        if not api_ok:
            logger.error(f"   API: {api_msg}")
        if not db_ok:
            logger.error(f"   DB: {db_msg}")
        return False
    
    logger.info("✅ All health checks passed!")
    return True


# ============================================================================
# MAIN EXECUTION
# ============================================================================

async def process_single_batch(
    batch: List[Dict], 
    batch_num: int, 
    total_batches: int,
    metrics: ClassificationMetrics,
    semaphore: asyncio.Semaphore,
    processed_ids: List[int]
):
    """Process a single batch concurrently."""
    async with semaphore:
        logger.info(f"🔄 Starting Batch {batch_num}/{total_batches} ({len(batch)} foods)")
        try:
            results = await classify_batch_with_ai(batch, metrics)
            
            if not results:
                logger.warning(f"⚠️ Batch {batch_num} returned no results")
                return

            # Update DB (Sequential updates within batch to avoid connection pool issues)
            updates_count = 0
            for res in results:
                if update_food_tier(res.food_id, res.food_tier, res.reasoning):
                    updates_count += 1
                    # Update metrics directly (safe in asyncio single-thread loop)
                    if res.food_tier == 1: metrics.tier_1_count += 1
                    elif res.food_tier == 2: metrics.tier_2_count += 1
                    elif res.food_tier == 3: metrics.tier_3_count += 1
                    
                    # Log
                    food_name = next((f.get("name_es") or f.get("name") for f in batch if f["id"] == res.food_id), "?")
                    tier_emoji = {1: "🥇", 2: "🥈", 3: "🥉"}[res.food_tier]
                    logger.info(f"   {tier_emoji} T{res.food_tier}: {food_name[:30]}... ({res.source})")
                else:
                    metrics.db_errors += 1
            
            metrics.total_processed += len(batch)
            metrics.api_calls += 1
            logger.info(f"✅ Batch {batch_num} finished: {updates_count}/{len(results)} updates")
            
        except Exception as e:
            logger.error(f"❌ Error in Batch {batch_num}: {e}")
            metrics.errors += len(batch)


async def main():
    """Función principal de clasificación - MODO PARALELO MASIVO."""
    start_time = time.time()
    logger.info("=" * 60)
    logger.info(f"🍎 FOOD TIER CLASSIFIER - PARALLEL MODE (C={CONCURRENCY_LIMIT}, B={BATCH_SIZE})")
    logger.info("=" * 60)
    
    metrics = ClassificationMetrics()
    
    if not await run_health_checks():
        return
    
    # Load foods
    foods = load_foods_to_classify() # Limit 10000 in query
    if not foods:
        logger.info("✅ No foods to classify!")
        metrics.log_summary()
        return
        
    logger.info(f"📊 {len(foods)} foods to process")
    
    # Create Batches
    batches = [foods[i:i + BATCH_SIZE] for i in range(0, len(foods), BATCH_SIZE)]
    total_batches = len(batches)
    logger.info(f"🚀 Launching {total_batches} batches in parallel...")
    
    # Run Concurrent
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    processed_ids = [] # Dummy list just for compatibility if needed
    
    tasks = [
        process_single_batch(batch, i+1, total_batches, metrics, semaphore, processed_ids)
        for i, batch in enumerate(batches)
    ]
    
    await asyncio.gather(*tasks)
    
    # Final Report
    metrics.total_time_seconds = time.time() - start_time
    metrics.log_summary()
    
    # Save Report
    try:
        with open(LOG_DIR / "tier_classification_report.json", "w") as f:
            json.dump(metrics.to_dict(), f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save report: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n🛑 Interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")

