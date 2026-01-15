-- Add priority columns for smart food search ordering
-- Phase 4 of Big Data Integration: Simple Ingredient Prioritization

-- 1. Add columns for prioritization
ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_simple_ingredient BOOLEAN DEFAULT FALSE;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;

-- 2. Create index for fast ordering
CREATE INDEX IF NOT EXISTS idx_foods_priority ON foods(is_simple_ingredient DESC, priority ASC);

-- 3. Mark common simple ingredients as priority
UPDATE foods SET is_simple_ingredient = TRUE, priority = 1
WHERE name ILIKE '%leche%' 
   OR name ILIKE '%huevo%' 
   OR name ILIKE '%arroz%' 
   OR name ILIKE '%pollo%' 
   OR name ILIKE '%carne%' 
   OR name ILIKE '%papa%'
   OR name ILIKE '%choclo%' 
   OR name ILIKE '%arveja%' 
   OR name ILIKE '%alverja%'
   OR name ILIKE '%avena%' 
   OR name ILIKE '%pan integral%'
   OR name ILIKE '%atun%' 
   OR name ILIKE '%atún%'
   OR name ILIKE '%salmon%' 
   OR name ILIKE '%salmón%'
   OR name ILIKE '%platano%' 
   OR name ILIKE '%plátano%'
   OR name ILIKE '%manzana%'
   OR name ILIKE '%naranja%'
   OR name ILIKE '%tomate%'
   OR name ILIKE '%cebolla%'
   OR name ILIKE '%ajo%'
   OR name ILIKE '%zanahoria%'
   OR name ILIKE '%brocoli%'
   OR name ILIKE '%espinaca%'
   OR name ILIKE '%lechuga%'
   OR name ILIKE '%queso%'
   OR name ILIKE '%yogurt%'
   OR name ILIKE '%frijol%'
   OR name ILIKE '%lenteja%'
   OR name ILIKE '%garbanzo%'
   OR name ILIKE '%pasta%'
   OR name ILIKE '%aceite de oliva%'
   OR name ILIKE '%palta%'
   OR name ILIKE '%aguacate%'
   OR name ILIKE '%almendra%'
   OR name ILIKE '%nuez%'
   OR name ILIKE '%mani%'
   OR name ILIKE '%maní%';

-- 4. Set medium priority (10) for other raw ingredients
UPDATE foods SET priority = 10
WHERE is_simple_ingredient = FALSE
  AND (
    culinary_category IN ('verdura', 'fruta', 'proteina', 'carbohidrato', 'grasa')
    OR category ILIKE '%raw%'
    OR category ILIKE '%fresh%'
  );

-- 5. Set lower priority (50) for prepared/processed foods
UPDATE foods SET priority = 50
WHERE is_simple_ingredient = FALSE
  AND priority = 100
  AND (
    name ILIKE '%preparado%'
    OR name ILIKE '%cocido%'
    OR name ILIKE '%frito%'
    OR name ILIKE '%asado%'
    OR name ILIKE '%horneado%'
    OR name ILIKE '%enlatado%'
  );
