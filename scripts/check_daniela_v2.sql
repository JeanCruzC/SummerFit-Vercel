-- CHECK DANIELA'S DATA (Compatible with Results Grid)
SELECT 
    p.full_name,
    p.user_id,
    p.is_public_nutrition,
    p.is_public_routine,
    (SELECT count(*) FROM public.workout_plans w WHERE w.user_id = p.user_id) as total_plans,
    (SELECT count(*) FROM public.workout_plans w WHERE w.user_id = p.user_id AND w.is_active = true) as active_plans,
    (SELECT count(*) FROM public.daily_logs l WHERE l.user_id = p.user_id) as total_logs,
    (SELECT count(*) FROM public.daily_logs l WHERE l.user_id = p.user_id AND l.log_date = CURRENT_DATE) as logs_today
FROM public.profiles p
WHERE p.full_name ILIKE '%Daniela Idrogo%';
