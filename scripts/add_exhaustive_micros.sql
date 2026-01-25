-- Migration to add missing micronutrients for exhaustive completion
ALTER TABLE foods
ADD COLUMN IF NOT EXISTS colina_mg float,
ADD COLUMN IF NOT EXISTS omega3_g float;
