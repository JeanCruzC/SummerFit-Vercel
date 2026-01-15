-- Add missing nutritional columns (Zinc, Potassium, Sodium)
-- Required by enrich_with_usda.py

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'zinc_mg') THEN
        ALTER TABLE public.foods ADD COLUMN zinc_mg numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'potassium_mg') THEN
        ALTER TABLE public.foods ADD COLUMN potassium_mg numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'sodium_mg') THEN
        ALTER TABLE public.foods ADD COLUMN sodium_mg numeric DEFAULT 0;
    END IF;
END $$;
