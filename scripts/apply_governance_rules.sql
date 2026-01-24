-- ============================================================================
-- GOVERNANCE: Enforce Data Integrity Rules (The "Audit Lock")
-- Run this AFTER data completion to prevent bad data from entering.
-- ============================================================================

-- 1. Enforce Valid Processing Levels
ALTER TABLE foods 
ADD CONSTRAINT check_processing_level 
CHECK (processing_level IN ('minimally_processed', 'processed', 'ultra_processed', 'culinary_ingredient'));

-- 2. Enforce Positive Values for Nutrition
ALTER TABLE foods
ADD CONSTRAINT check_positive_macros
CHECK (
    protein_g_per_100g >= 0 AND
    carbs_g_per_100g >= 0 AND
    fat_g_per_100g >= 0 AND
    calories_per_100g >= 0
);

-- 3. Enforce Data Quality Score Range
ALTER TABLE foods
ADD CONSTRAINT check_quality_score
CHECK (data_quality_score BETWEEN 0 AND 100);

-- 4. Enforce Serving Size Existence
-- (Optional: Only for Tier 1 foods if you have tiers, otherwise for all active)
-- ALTER TABLE foods
-- ADD CONSTRAINT check_serving_exists
-- CHECK (serving_size > 0 AND serving_unit IS NOT NULL);

COMMENT ON TABLE foods IS 'Official Food Database - USDA Compliant - Gated by Strict Constraints';
