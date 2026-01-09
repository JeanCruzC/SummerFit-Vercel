
-- Insert Basic Exercises (Home/Gym friendly)

-- Function to safely insert exercise if not exists
CREATE OR REPLACE FUNCTION insert_basic_exercise(
    p_slug text,
    p_title text,
    p_description text,
    p_type text,
    p_level text,
    p_body_part text,
    p_equipment text[],
    p_met numeric,
    p_ranking_score int
) RETURNS void AS $$
BEGIN
    INSERT INTO exercises (slug, title, description, type, level, body_part, equipment_required, met, ranking_score)
    VALUES (p_slug, p_title, p_description, p_type, p_level, p_body_part, p_equipment, p_met, p_ranking_score)
    ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        level = EXCLUDED.level,
        body_part = EXCLUDED.body_part,
        equipment_required = EXCLUDED.equipment_required,
        met = EXCLUDED.met,
        ranking_score = EXCLUDED.ranking_score;
END;
$$ LANGUAGE plpgsql;

-- 1. Cardio (No Equipment)
SELECT insert_basic_exercise(
    'running', 
    'Correr (Running)', 
    'Ejercicio cardiovascular fundamental. Mejora la resistencia y quema calorías. Puede realizarse al aire libre o en cinta.', 
    'Cardio', 'Principiante', 'Full Body', ARRAY['Peso corporal'], 8.0, 100
);

SELECT insert_basic_exercise(
    'jumping-jacks', 
    'Saltos de Tijera (Jumping Jacks)', 
    'Ejercicio de cardio clásico para calentar y elevar el ritmo cardíaco. Involucra todo el cuerpo.', 
    'Cardio', 'Principiante', 'Full Body', ARRAY['Peso corporal'], 8.0, 95
);

SELECT insert_basic_exercise(
    'burpees', 
    'Burpees', 
    'Ejercicio intenso de cuerpo completo que combina fuerza y resistencia cardiovascular.', 
    'Cardio', 'Intermedio', 'Full Body', ARRAY['Peso corporal'], 10.0, 90
);

-- 2. Push (Chest/Triceps/Shoulders)
SELECT insert_basic_exercise(
    'push-ups', 
    'Flexiones (Push-ups)', 
    'Ejercicio fundamental para pecho, hombros y tríceps. Mantén el cuerpo recto como una tabla.', 
    'Fuerza', 'Principiante', 'Pecho', ARRAY['Peso corporal'], 3.8, 98
);

SELECT insert_basic_exercise(
    'incline-push-ups', 
    'Flexiones Inclinadas', 
    'Variante más fácil de flexiones, con las manos apoyadas en una superficie elevada.', 
    'Fuerza', 'Principiante', 'Pecho', ARRAY['Peso corporal'], 3.5, 85
);

SELECT insert_basic_exercise(
    'diamond-push-ups', 
    'Flexiones Diamante', 
    'Variante de flexiones con las manos juntas, enfocada en los tríceps.', 
    'Fuerza', 'Intermedio', 'Tríceps', ARRAY['Peso corporal'], 4.0, 88
);

SELECT insert_basic_exercise(
    'dips', 
    'Fondos (Dips)', 
    'Excelente ejercicio para pecho inferior y tríceps. Requiere barras paralelas o una silla resistente.', 
    'Fuerza', 'Intermedio', 'Tríceps', ARRAY['Peso corporal'], 4.0, 91
);

-- 3. Pull (Back/Biceps)
SELECT insert_basic_exercise(
    'pull-ups', 
    'Dominadas (Pull-ups)', 
    'El mejor ejercicio de peso corporal para espalda y bíceps. Requiere una barra.', 
    'Fuerza', 'Intermedio', 'Espalda', ARRAY['Barra de dominadas'], 5.0, 97
);

SELECT insert_basic_exercise(
    'chin-ups', 
    'Dominadas Supinas (Chin-ups)', 
    'Similar a las dominadas pero con agarre supino (palmas hacia ti). Enfatiza más los bíceps.', 
    'Fuerza', 'Intermedio', 'Bíceps', ARRAY['Barra de dominadas'], 5.0, 92
);

SELECT insert_basic_exercise(
    'superman', 
    'Superman', 
    'Ejercicio para fortalecer la espalda baja (lumbares) sin equipo.', 
    'Fuerza', 'Principiante', 'Espalda', ARRAY['Peso corporal'], 2.5, 80
);

-- 4. Legs
SELECT insert_basic_exercise(
    'squats', 
    'Sentadillas (Squats)', 
    'El rey de los ejercicios de pierna. Trabaja cuádriceps, glúteos e isquios.', 
    'Fuerza', 'Principiante', 'Piernas', ARRAY['Peso corporal'], 5.0, 99
);

SELECT insert_basic_exercise(
    'lunges', 
    'Zancadas (Lunges)', 
    'Excelente ejercicio unilateral para piernas y glúteos. Mejora el equilibrio.', 
    'Fuerza', 'Principiante', 'Piernas', ARRAY['Peso corporal'], 4.0, 94
);

SELECT insert_basic_exercise(
    'glute-bridge', 
    'Puente de Glúteos', 
    'Ejercicio para aislar y fortalecer los glúteos.', 
    'Fuerza', 'Principiante', 'Glúteos', ARRAY['Peso corporal'], 3.0, 89
);

SELECT insert_basic_exercise(
    'calf-raises', 
    'Elevación de Talones', 
    'Ejercicio simple para fortalecer las pantorrillas.', 
    'Fuerza', 'Principiante', 'Pantorrillas', ARRAY['Peso corporal'], 2.5, 82
);

-- 5. Core
SELECT insert_basic_exercise(
    'plank', 
    'Plancha (Plank)', 
    'Ejercicio isométrico para fortalecer todo el core/abdomen.', 
    'Fuerza', 'Principiante', 'Abdomen', ARRAY['Peso corporal'], 3.0, 96
);

SELECT insert_basic_exercise(
    'crunches', 
    'Abdominales (Crunches)', 
    'Ejercicio clásico para el recto abdominal.', 
    'Fuerza', 'Principiante', 'Abdomen', ARRAY['Peso corporal'], 3.0, 93
);

SELECT insert_basic_exercise(
    'bicycle-crunches', 
    'Abdominales Bicicleta', 
    'Excelente para trabajar los oblicuos y el recto abdominal.', 
    'Fuerza', 'Principiante', 'Abdomen', ARRAY['Peso corporal'], 4.0, 90
);

-- 6. Gym Basics
SELECT insert_basic_exercise(
    'bench-press', 
    'Press de Banca (Bench Press)', 
    'Ejercicio compuesto fundamental para pecho, tríceps y hombros usando barra.', 
    'Fuerza', 'Intermedio', 'Pecho', ARRAY['Barra', 'Banco plano'], 5.0, 88
);

SELECT insert_basic_exercise(
    'deadlift', 
    'Peso Muerto (Deadlift)', 
    'Ejercicio de cuerpo completo que enfatiza la cadena posterior.', 
    'Fuerza', 'Intermedio', 'Espalda', ARRAY['Barra'], 6.0, 89
);

SELECT insert_basic_exercise(
    'squat-barbell', 
    'Sentadilla con Barra', 
    'La versión con peso de la sentadilla clásica.', 
    'Fuerza', 'Intermedio', 'Piernas', ARRAY['Barra', 'Rack'], 6.0, 95
);

SELECT insert_basic_exercise(
    'shoulder-press', 
    'Press Militar (Shoulder Press)', 
    'Ejercicio vertical de empuje para desarrollar hombros fuertes.', 
    'Fuerza', 'Intermedio', 'Hombros', ARRAY['Mancuernas'], 4.0, 86
);

SELECT insert_basic_exercise(
    'dumbbell-curl', 
    'Curl de Bíceps con Mancuernas', 
    'Ejercicio de aislamiento para desarrollar los bíceps.', 
    'Fuerza', 'Principiante', 'Bíceps', ARRAY['Mancuernas'], 3.0, 87
);

SELECT insert_basic_exercise(
    'tricep-extension', 
    'Extensión de Tríceps', 
    'Ejercicio de aislamiento para la parte posterior del brazo.', 
    'Fuerza', 'Principiante', 'Tríceps', ARRAY['Mancuernas'], 3.0, 84
);

-- Clean up helper function
DROP FUNCTION insert_basic_exercise;
