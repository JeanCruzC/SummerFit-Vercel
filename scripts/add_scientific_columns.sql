-- Add scientific columns to exercises table
-- Based on Encyclopedia of Bodybuilding Exercises & Biomechanical Analysis

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS movement_pattern TEXT, -- e.g., 'horizontal_press', 'squat'
ADD COLUMN IF NOT EXISTS score_hypertrophy INTEGER CHECK (score_hypertrophy BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS score_difficulty INTEGER CHECK (score_difficulty BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS score_risk INTEGER CHECK (score_risk BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS score_strength INTEGER CHECK (score_strength BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS score_stability INTEGER CHECK (score_stability BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS activation_profile JSONB, -- { "high": ["muscle1"], "medium": ["muscle2"] }
ADD COLUMN IF NOT EXISTS scientific_notes TEXT; -- Technical cues and biomechanical notes

-- Index for faster filtering by pattern and score
CREATE INDEX IF NOT EXISTS idx_exercises_pattern ON exercises(movement_pattern);
CREATE INDEX IF NOT EXISTS idx_exercises_hypertrophy ON exercises(score_hypertrophy);
