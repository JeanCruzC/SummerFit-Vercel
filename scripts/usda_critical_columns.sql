-- Add critical USDA compliance columns to foods
ALTER TABLE public.foods
    ADD COLUMN IF NOT EXISTS usda_group text,
    ADD COLUMN IF NOT EXISTS usda_food_group text,
    ADD COLUMN IF NOT EXISTS serving_equiv_grams numeric,
    ADD COLUMN IF NOT EXISTS processing_level text,
    ADD COLUMN IF NOT EXISTS is_whole_grain boolean,
    ADD COLUMN IF NOT EXISTS added_sugars_g_per_100g numeric,
    ADD COLUMN IF NOT EXISTS data_quality_flags jsonb,
    ADD COLUMN IF NOT EXISTS data_audited_at timestamptz;

-- Optional safety index for pantry upserts (fixes ON CONFLICT errors)
CREATE UNIQUE INDEX IF NOT EXISTS user_pantry_user_food_id_unique
    ON public.user_pantry (user_id, food_id)
    WHERE food_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_pantry_user_id_idx
    ON public.user_pantry (user_id);
