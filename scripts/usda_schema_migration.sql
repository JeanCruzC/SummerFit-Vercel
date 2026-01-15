-- Add comprehensive nutritional columns to foods table
-- Based on USDA Foundation Foods dataset
-- This enables the Clinical Nutrition Engine

DO $$ 
BEGIN 
    -- 1. Essential Minerals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'iron_mg') THEN
        ALTER TABLE public.foods ADD COLUMN iron_mg numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'calcium_mg') THEN
        ALTER TABLE public.foods ADD COLUMN calcium_mg numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'magnesium_mg') THEN
        ALTER TABLE public.foods ADD COLUMN magnesium_mg numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'zinc_mg') THEN
        ALTER TABLE public.foods ADD COLUMN zinc_mg numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'potassium_mg') THEN
        ALTER TABLE public.foods ADD COLUMN potassium_mg numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'sodium_mg') THEN
        ALTER TABLE public.foods ADD COLUMN sodium_mg numeric DEFAULT 0;
    END IF;

    -- 2. Essential Vitamins
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'vitamin_d_iu') THEN
        ALTER TABLE public.foods ADD COLUMN vitamin_d_iu numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'vitamin_c_mg') THEN
        ALTER TABLE public.foods ADD COLUMN vitamin_c_mg numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'vitamin_a_iu') THEN
        ALTER TABLE public.foods ADD COLUMN vitamin_a_iu numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'vitamin_b12_ug') THEN
        ALTER TABLE public.foods ADD COLUMN vitamin_b12_ug numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'folate_ug') THEN
        ALTER TABLE public.foods ADD COLUMN folate_ug numeric DEFAULT 0;
    END IF;

    -- 3. Others (Fiber, Sugar)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'fiber_g') THEN
        ALTER TABLE public.foods ADD COLUMN fiber_g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'sugars_g') THEN
        ALTER TABLE public.foods ADD COLUMN sugars_g numeric DEFAULT 0;
    END IF;

    -- 4. Metadata & Portions (Smart Portions)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'fdc_id') THEN
        ALTER TABLE public.foods ADD COLUMN fdc_id BIGINT; -- Link to USDA
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'serving_size') THEN
        ALTER TABLE public.foods ADD COLUMN serving_size numeric DEFAULT 100; -- e.g. 150
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'serving_unit') THEN
        ALTER TABLE public.foods ADD COLUMN serving_unit text DEFAULT 'g'; -- e.g. "g" or "ml"
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'brand_name') THEN
        ALTER TABLE public.foods ADD COLUMN brand_name text; -- For branded foods
    END IF;

    -- Index for nutrition searches
    -- CREATE INDEX IF NOT EXISTS idx_foods_micros ON public.foods(iron_mg, calcium_mg, magnesium_mg);
END $$;
