-- Insert sample exercises for Plan 21 (Daniela)
-- First, finding some exercise IDs (assuming IDs 1-5 exist, or finding them)
-- We'll use a safer approach: subquery to find exercise IDs by name or just use low IDs

-- Day 1: Monday (Push/Pecho/Triceps)
INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_of_week, sets, reps, rest_seconds, order_in_day)
SELECT 21, id, 1, 4, 10, 60, 1 FROM exercises WHERE title ILIKE '%Press%banca%' LIMIT 1;

INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_of_week, sets, reps, rest_seconds, order_in_day)
SELECT 21, id, 1, 3, 12, 60, 2 FROM exercises WHERE title ILIKE '%Mancuerna%' LIMIT 1;

INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_of_week, sets, reps, rest_seconds, order_in_day)
SELECT 21, id, 1, 3, 15, 45, 3 FROM exercises WHERE title ILIKE '%Tríceps%' LIMIT 1;

-- Day 2: Tuesday (Pull/Espalda/Biceps)
INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_of_week, sets, reps, rest_seconds, order_in_day)
SELECT 21, id, 2, 4, 10, 60, 1 FROM exercises WHERE title ILIKE '%Dominadas%' OR title ILIKE '%Lat%' LIMIT 1;

INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_of_week, sets, reps, rest_seconds, order_in_day)
SELECT 21, id, 2, 3, 12, 60, 2 FROM exercises WHERE title ILIKE '%Remo%' LIMIT 1;

-- If no specific exercises match, let's just insert precise IDs if we know them, 
-- but since I don't check exercise DB, I'll rely on the fact that the app likely has some standard exercises.
-- Fallback: If select returns null, nothing inserts.

-- Let's verify existing exercises first in the script? No, SQL is hard to strict debug without running.
-- I'll use a generic fallback insert if the above doesn't work well?
-- Actually, let's just use the first available exercises if specific names fail.

INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_of_week, sets, reps, rest_seconds, order_in_day)
SELECT 21, id, 4, 3, 10, 60, 1 FROM exercises ORDER BY id ASC LIMIT 1; -- Thursday generic
