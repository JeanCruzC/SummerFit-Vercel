-- ============================================================
-- USDA FoodData Central Schema Migration
-- Adds comprehensive nutritional columns to the foods table
-- ============================================================

-- Add USDA FoodData Central unique identifier
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS fdc_id INTEGER UNIQUE;

-- Macronutrient details
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS fiber_g_per_100g DECIMAL(8,2) DEFAULT 0;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS sugar_g_per_100g DECIMAL(8,2) DEFAULT 0;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS saturated_fat_g_per_100g DECIMAL(8,2) DEFAULT 0;

-- Minerals
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS sodium_mg_per_100g DECIMAL(8,2) DEFAULT 0;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS potassium_mg_per_100g DECIMAL(8,2) DEFAULT 0;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS calcium_mg_per_100g DECIMAL(8,2) DEFAULT 0;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS iron_mg_per_100g DECIMAL(8,2) DEFAULT 0;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS cholesterol_mg_per_100g DECIMAL(8,2) DEFAULT 0;

-- Vitamins
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS vitamin_a_iu_per_100g DECIMAL(8,2) DEFAULT 0;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS vitamin_c_mg_per_100g DECIMAL(8,2) DEFAULT 0;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS vitamin_d_iu_per_100g DECIMAL(8,2) DEFAULT 0;

-- Metadata
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS serving_size_g DECIMAL(8,2);
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS serving_description TEXT;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS ingredients TEXT;

-- ============================================================
-- INDEXES
-- ============================================================

-- Index on fdc_id for efficient USDA lookups
CREATE INDEX IF NOT EXISTS idx_foods_fdc_id ON public.foods(fdc_id);

-- Index on data_source for filtering by source
CREATE INDEX IF NOT EXISTS idx_foods_data_source ON public.foods(data_source);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON COLUMN public.foods.fdc_id IS 'USDA FoodData Central unique identifier';
COMMENT ON COLUMN public.foods.fiber_g_per_100g IS 'Dietary fiber in grams per 100g';
COMMENT ON COLUMN public.foods.sugar_g_per_100g IS 'Total sugars in grams per 100g';
COMMENT ON COLUMN public.foods.saturated_fat_g_per_100g IS 'Saturated fat in grams per 100g';
COMMENT ON COLUMN public.foods.sodium_mg_per_100g IS 'Sodium in milligrams per 100g';
COMMENT ON COLUMN public.foods.potassium_mg_per_100g IS 'Potassium in milligrams per 100g';
COMMENT ON COLUMN public.foods.calcium_mg_per_100g IS 'Calcium in milligrams per 100g';
COMMENT ON COLUMN public.foods.iron_mg_per_100g IS 'Iron in milligrams per 100g';
COMMENT ON COLUMN public.foods.cholesterol_mg_per_100g IS 'Cholesterol in milligrams per 100g';
COMMENT ON COLUMN public.foods.vitamin_a_iu_per_100g IS 'Vitamin A in IU per 100g';
COMMENT ON COLUMN public.foods.vitamin_c_mg_per_100g IS 'Vitamin C in milligrams per 100g';
COMMENT ON COLUMN public.foods.vitamin_d_iu_per_100g IS 'Vitamin D in IU per 100g';
COMMENT ON COLUMN public.foods.data_source IS 'Data source: manual, usda_sr, usda_foundation';
COMMENT ON COLUMN public.foods.serving_size_g IS 'Common serving size in grams';
COMMENT ON COLUMN public.foods.serving_description IS 'Human-readable serving description';
COMMENT ON COLUMN public.foods.brand_name IS 'Brand name for branded products';
COMMENT ON COLUMN public.foods.ingredients IS 'Ingredients list';
