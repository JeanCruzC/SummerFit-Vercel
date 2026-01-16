-- Add supporting columns for AI v2.0 Audit
ALTER TABLE foods ADD COLUMN IF NOT EXISTS ai_confidence float;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS ai_reasoning text;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS classified_at timestamptz;

-- Index for performance (fetching unclassified foods)
CREATE INDEX IF NOT EXISTS idx_foods_classified_at ON foods(classified_at);
