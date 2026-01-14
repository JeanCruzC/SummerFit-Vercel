-- Find Daniela and check her data
DO $$
DECLARE
    target_uid uuid;
    plan_count int;
    active_plan_count int;
    log_count int;
    recent_log_count int;
    r record;
BEGIN
    SELECT user_id INTO target_uid FROM public.profiles WHERE full_name ILIKE '%Daniela Idrogo%' LIMIT 1;
    
    IF target_uid IS NULL THEN
        RAISE NOTICE 'User Daniela Idrogo not found!';
        RETURN;
    END IF;

    RAISE NOTICE 'Found User ID: %', target_uid;

    -- Check Workout Plans
    SELECT count(*) INTO plan_count FROM public.workout_plans WHERE user_id = target_uid;
    SELECT count(*) INTO active_plan_count FROM public.workout_plans WHERE user_id = target_uid AND is_active = true;
    
    RAISE NOTICE 'Total Workout Plans: %', plan_count;
    RAISE NOTICE 'Active Workout Plans: %', active_plan_count;

    -- Check Daily Logs
    SELECT count(*) INTO log_count FROM public.daily_logs WHERE user_id = target_uid;
    SELECT count(*) INTO recent_log_count FROM public.daily_logs WHERE user_id = target_uid AND log_date >= (CURRENT_DATE - INTERVAL '7 days');

    RAISE NOTICE 'Total Daily Logs: %', log_count;
    RAISE NOTICE 'Recent Daily Logs (Last 7 Days): %', recent_log_count;

    -- List most recent log date
    FOR r IN SELECT log_date FROM public.daily_logs WHERE user_id = target_uid ORDER BY log_date DESC LIMIT 1 LOOP
        RAISE NOTICE 'Most Recent Log Date: %', r.log_date;
    END LOOP;

END $$;
