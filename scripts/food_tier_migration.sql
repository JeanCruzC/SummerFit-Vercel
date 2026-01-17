-- ============================================================================
-- MIGRATION: Add food_tier column for Whole Foods prioritization
-- Date: 2026-01-16
-- Author: SummerFit Team
-- ============================================================================

-- Add food_tier column
-- 1 = Whole Food (básico: huevo, arroz, pollo genérico)
-- 2 = Simple Ingredient (accesible: pechuga, salmón)  
-- 3 = Specialty (excluir: ribeye, wagyu, trufa)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS food_tier INTEGER DEFAULT 2;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_foods_tier ON foods(food_tier);

-- Add audit columns
ALTER TABLE foods ADD COLUMN IF NOT EXISTS tier_reasoning TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN foods.food_tier IS 
'Prioridad: 1=Whole Food (básico), 2=Simple, 3=Specialty (excluir del generador)';

-- ============================================================================
-- VERIFICATION QUERY (run after migration)
-- ============================================================================
-- SELECT food_tier, COUNT(*) 
-- FROM foods 
-- GROUP BY food_tier 
-- ORDER BY food_tier;
