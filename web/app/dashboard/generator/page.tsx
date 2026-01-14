'use client';

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { RoutineGenerator, type GeneratedRoutine, type RoutineGoal, type RoutineLevel } from "@/lib/generation/routine_generator";
import type { UserEquipment, UserProfile, Exercise } from "@/types";
import { useRouter } from "next/navigation";
import { ProfileAnalyzer, type ProfileAnalysis } from "@/lib/intelligence/profile_analyzer";
import { Brain, Target, Sparkles, Settings, CheckCircle, Activity, Clock, Gauge, Timer, Repeat, Info } from "lucide-react";

import { useLanguage } from "@/lib/i18n/context";

// Dumbbell icon SVG for exercises without images
const DumbbellIcon = ({ className }: { className?: string }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M6.5 6.5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V6.5z" />
        <path d="M13.5 6.5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V6.5z" />
        <path d="M4 8v8" />
        <path d="M20 8v8" />
        <path d="M10.5 12h3" />
    </svg>
);

/**
 * Select the best media for the user's gender
 * Priority: 1. Matching gender, 2. Fallback to any available
 */
function getGenderMedia(exercise: Exercise, userGender: 'M' | 'F') {
    const media = exercise.exercise_media;
    if (!media || media.length === 0) return undefined;

    // Try to find matching gender first
    const genderMatch = media.find(m =>
        m.gender?.toLowerCase() === (userGender === 'F' ? 'female' : 'male') ||
        m.gender?.toLowerCase() === (userGender === 'F' ? 'f' : 'm') ||
        m.gender?.toLowerCase() === (userGender === 'F' ? 'mujer' : 'hombre')
    );

    if (genderMatch) return genderMatch;

    // Fallback to first available
    return media[0];
}

export default function GeneratorPage() {
    const router = useRouter();
    const { t, lang } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [equipment, setEquipment] = useState<UserEquipment[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);

    // Form State
    const [goal, setGoal] = useState<RoutineGoal>('hypertrophy');
    const [level, setLevel] = useState<RoutineLevel>('beginner');
    const [daysAvailable, setDaysAvailable] = useState<number>(4);
    const [routine, setRoutine] = useState<GeneratedRoutine | null>(null);
    const [error, setError] = useState("");
    const [selectedExercise, setSelectedExercise] = useState<any>(null);

    // Helper for BMI category reference
    const getBMILabel = (category: string) => {
        if (category === 'obese') return lang === 'en' ? 'Obesity' : 'Obesidad';
        if (category === 'overweight') return lang === 'en' ? 'Overweight' : 'Sobrepeso';
        if (category === 'normal') return 'Normal';
        return lang === 'en' ? 'Underweight' : 'Bajo peso';
    };

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Load equipment
            const { data: eqData } = await supabase
                .from('user_equipment')
                .select('*')
                .eq('user_id', user.id);

            // Load profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            setEquipment(eqData || []);
            setProfile(profileData);

            // Analyze profile and pre-select goal
            if (profileData) {
                const equipmentTypes = eqData?.map(e => e.equipment_type) || [];
                const profileAnalysis = ProfileAnalyzer.analyze(
                    profileData.weight_kg,
                    profileData.height_cm,
                    profileData.target_weight_kg,
                    equipmentTypes
                );
                setAnalysis(profileAnalysis);
                setGoal(profileAnalysis.recommended_goal);
            }

            setLoading(false);
        }
        loadData();
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        setError("");
        setRoutine(null);

        try {
            const generator = new RoutineGenerator();
            const generated = await generator.generate({
                goal,
                level,
                gender: (profile?.gender as 'M' | 'F') || 'M',  // Gender-aware selection
                daysAvailable,
                equipment,
                profile: profile ? {
                    weight_kg: profile.weight_kg,
                    height_cm: profile.height_cm,
                    target_weight_kg: profile.target_weight_kg
                } : undefined
            });

            setRoutine(generated);
        } catch (err: any) {
            setError(err.message || "Error al generar rutina");
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveRoutine = async () => {
        if (!routine) return;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            // 1. Deactivate current active plans
            await supabase
                .from('workout_plans')
                .update({ is_active: false })
                .eq('user_id', user.id);

            await supabase
                .from('saved_routines')
                .update({ is_active: false })
                .eq('user_id', user.id);

            // 2. Save to saved_routines (The History/AI Brain)
            const { data: savedRoutine, error: srError } = await supabase
                .from('saved_routines')
                .insert({
                    user_id: user.id,
                    name: routine.name,
                    is_active: true,
                    configuration: { goal, level, daysAvailable, equipment: equipment.map(e => e.equipment_type) },
                    schedule: {
                        days: routine.days.map((d, i) => ({ id: `day_${i}`, ...d })),
                        cardio: routine.cardio_plan
                    },
                    brain_state: {
                        split: routine.split,
                        weeklyVolume: routine.weeklyVolume,
                        estimated_calories_weekly: routine.estimated_calories_burned
                    },
                    estimated_calories_weekly: routine.estimated_calories_burned,
                    total_met_hours: routine.total_met_hours,
                    recommended_schedule: routine.recommended_schedule
                })
                .select()
                .single();

            if (srError) throw srError;

            // 3. Save to workout_plans (The Dashboard Source)
            const { data: mainPlan, error: mpError } = await supabase
                .from('workout_plans')
                .insert({
                    user_id: user.id,
                    name: routine.name,
                    description: routine.description,
                    days_per_week: daysAvailable,
                    total_met_hours: routine.total_met_hours,
                    estimated_calories_weekly: routine.estimated_calories_burned,
                    is_active: true,
                    brain_state: { split: routine.split, weeklyVolume: routine.weeklyVolume },
                    cardio_plan: routine.cardio_plan,
                    source_routine_id: savedRoutine.id
                })
                .select()
                .single();

            if (mpError) throw mpError;

            // 4. Save individual exercises to workout_plan_exercises (Relational)
            const exerciseInserts: any[] = [];
            // We map indices from routine.recommended_schedule to real week days
            // Monday=1 ... Sunday=7 for this table
            const dayMapToIndices = { 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 7 };

            let currentDayIdx = 0;
            if (routine.recommended_schedule) {
                routine.recommended_schedule.forEach((dayName, scheduleIdx) => {
                    if (dayName !== 'Rest') {
                        const routineDay = routine.days[currentDayIdx % routine.days.length];
                        const dayOfWeek = dayMapToIndices[Object.keys(dayMapToIndices)[scheduleIdx] as keyof typeof dayMapToIndices];

                        routineDay.exercises.forEach((ex: any, order: number) => {
                            exerciseInserts.push({
                                workout_plan_id: mainPlan.id,
                                exercise_id: ex.exercise.id,
                                day_of_week: dayOfWeek,
                                sets: ex.sets,
                                reps: parseInt(ex.reps) || 10, // Parse first number from "6-10" range
                                duration_minutes: ex.duration_minutes || 0,
                                rest_seconds: parseInt(ex.rest) || 60,
                                order_in_day: order
                            });
                        });
                        currentDayIdx++;
                    }
                });

                if (exerciseInserts.length > 0) {
                    console.log(`📝 Inserting ${exerciseInserts.length} exercises to plan ${mainPlan.id}`);
                    const { error: exError } = await supabase.from('workout_plan_exercises').insert(exerciseInserts);
                    if (exError) {
                        console.error("❌ Error inserting exercises:", exError);
                        throw new Error(`Failed to save exercises: ${exError.message}`);
                    }
                    console.log("✅ Exercises inserted successfully!");
                } else {
                    console.warn("⚠️ No exercises to insert! exerciseInserts is empty.");
                }
            }

            // 5. --- AUTO-POPULATE CALENDAR ---
            // user_schedule uses 0=Sunday, 1=Monday
            const dbDayIndices = [1, 2, 3, 4, 5, 6, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
            const scheduleInserts = [];
            let routineDayCounter = 0;

            if (routine.recommended_schedule) {
                for (let i = 0; i < routine.recommended_schedule.length; i++) {
                    const activity = routine.recommended_schedule[i];
                    if (activity !== 'Rest') {
                        scheduleInserts.push({
                            user_id: user.id,
                            day_of_week: dbDayIndices[i],
                            time_slot: 'morning',
                            saved_routine_id: savedRoutine.id,
                            routine_day_id: `day_${routineDayCounter % routine.days.length}`
                        });
                        routineDayCounter++;
                    }
                }

                if (scheduleInserts.length > 0) {
                    await supabase.from('user_schedule').insert(scheduleInserts);
                }
            }

            router.push(`/dashboard/workout-plan/${savedRoutine.id}/calendar`);
        } catch (err) {
            console.error(err);
            alert('Error al guardar rutina');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                        <Brain className="h-9 w-9 text-purple-600" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                            {t('generator.title')}
                        </span>
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        {t('generator.subtitle')}
                    </p>
                    {analysis && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-3">
                                <Target className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{t('generator.profileAnalysis')}</h3>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                                        BMI: <span className="font-bold">{analysis.bmi}</span> ({getBMILabel(analysis.bmi_category)})
                                    </p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                        <CheckCircle className="inline h-4 w-4 mr-1" /> {t('generator.recommendedGoal')}: <span className="capitalize">{t(`generator.goals.${goal}` as any) || goal}</span>
                                    </p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mt-1">
                                        <Activity className="inline h-4 w-4 mr-1" /> {t('generator.cardio')}: {analysis.recommended_cardio.frequency}x{t('generator.perWeek')}, {analysis.recommended_cardio.duration}min - {analysis.recommended_cardio.options.join(', ')}
                                    </p>
                                    {analysis.warnings.length > 0 && (
                                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                            {analysis.warnings.map((w, i) => <div key={i}>{w}</div>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </header>

                {/* Configuration Panel */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Goal Selection */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('generator.mainGoal')}</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {(['hypertrophy', 'strength', 'fat_loss', 'recomposition'] as const).map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setGoal(g)}
                                        className={`p-3 rounded-xl border text-sm font-semibold transition-all capitalize ${goal === g
                                            ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                                            : 'border-gray-200 text-gray-500 hover:border-purple-200'
                                            }`}
                                    >
                                        {t(`generator.goals.${g}` as any)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Level */}
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('generator.experienceLevel')}</label>
                            <select
                                value={level}
                                onChange={(e) => setLevel(e.target.value as RoutineLevel)}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none font-medium focus:ring-2 focus:ring-purple-500 text-zinc-900 dark:text-white"
                            >
                                <option value="beginner">{t('generator.beginner')}</option>
                                <option value="intermediate">{t('generator.intermediate')}</option>
                                <option value="advanced">{t('generator.advanced')}</option>
                            </select>
                        </div>

                        {/* Days Available (NEW) */}
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('generator.daysAvailable')}</label>
                            <div className="flex gap-2">
                                {[3, 4, 5, 6].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDaysAvailable(d)}
                                        className={`flex-1 p-3 rounded-xl font-bold transition-all ${daysAvailable === d
                                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md transform scale-105'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800'
                                            }`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-6">
                        <div className="text-sm text-zinc-500">
                            <span className="sr-only">Stats</span>
                            {equipment.length > 0 ? (
                                <span>✅ {equipment.length} {t('generator.detectedEquipment')}</span>
                            ) : (
                                <span className="text-amber-500">⚠️ {t('generator.noEquipment')}</span>
                            )}
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={generating || loading}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <Settings className="h-5 w-5 animate-spin" /> {t('generator.analyzing')}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5" /> {t('generator.generateBtn')}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 mb-6 font-medium animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {/* Results Section */}
                {routine && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
                        <div className="flex justify-end">
                            <button
                                onClick={handleSaveRoutine}
                                className="px-8 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 shadow-lg hover:shadow-green-500/25 transition-all flex items-center gap-2"
                            >
                                <CheckCircle className="h-5 w-5" /> {t('generator.saveBtn')}
                            </button>
                        </div>
                        <div className="bg-zinc-900 dark:bg-black rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="inline-block py-1 px-3 rounded-full bg-white/10 border border-white/20 text-xs font-bold mb-4 uppercase tracking-widest">
                                    {routine.split.replace('_', ' ')} PROTOCOL
                                </span>
                                <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">{routine.name}</h2>
                                <p className="text-zinc-400 max-w-xl text-lg leading-relaxed">{routine.description}</p>

                                <div className="mt-6 flex gap-6 text-sm font-medium">
                                    <div className="flex flex-col">
                                        <span className="text-zinc-500 uppercase text-[10px] tracking-wider">{t('generator.weeklyVolume')}</span>
                                        <span className="text-2xl font-bold text-white">{routine.weeklyVolume} <span className="text-lg text-zinc-500 font-normal">{t('generator.setsPerMuscle')}</span></span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-zinc-500 uppercase text-[10px] tracking-wider">{t('generator.frequency')}</span>
                                        <span className="text-2xl font-bold text-white">{(routine.days.length / 2).toFixed(1)}x <span className="text-lg text-zinc-500 font-normal">{t('generator.perWeek')}</span></span>
                                    </div>
                                </div>
                            </div>
                            {/* Abstract decoration */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                        </div>

                        {/* Scientific Cardio Module (New) */}
                        {routine.cardio_plan && (
                            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-3xl p-6 border-2 border-orange-100 dark:border-orange-900 mb-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
                                        <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-orange-900 dark:text-orange-100 uppercase tracking-wide">
                                            {t('generator.metabolicProtocol')}
                                        </h3>
                                        <div className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                            {t('common.goal')}: {routine.cardio_plan.type === 'low_impact' ? t('generator.fatLossGoal') : routine.cardio_plan.type === 'hiit' ? t('generator.hiitGoal') : t('generator.cardioHealthGoal')}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/50">
                                        <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">{t('generator.weeklyDose')}</div>
                                        <div className="text-3xl font-black text-zinc-900 dark:text-white">
                                            {routine.cardio_plan.frequency_per_week} <span className="text-lg font-bold text-zinc-400">{t('generator.sessions')}</span>
                                        </div>
                                        <div className="text-xs font-medium text-orange-600 mt-1">{t('generator.independent')}</div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/50">
                                        <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">{t('generator.duration')}</div>
                                        <div className="text-3xl font-black text-zinc-900 dark:text-white">
                                            {routine.cardio_plan.duration} <span className="text-lg font-bold text-zinc-400">min</span>
                                        </div>
                                        <div className="text-xs font-medium text-zinc-500 mt-1">Zona Recomendada: 2 (Conversacional)</div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/50">
                                        <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">{t('generator.optimalTiming')}</div>
                                        <div className="font-bold text-zinc-900 dark:text-white leading-tight">
                                            {routine.cardio_plan.type === 'low_impact' ? t('generator.anyTime') : t('generator.farFromLegs')}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-2 leading-relaxed">
                                            • Días de Pesas: <strong>{t('generator.postWorkout')}</strong><br />
                                            • Días Libres: <strong>{t('generator.singleSession')}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-orange-900 dark:text-orange-200 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                        {t('generator.approvedOptions')}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {routine.cardio_plan.exercises[0].reason.split(', ').map((opt, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 font-bold text-xs">
                                                    {i + 1}
                                                </div>
                                                <span className="font-medium text-zinc-700 dark:text-zinc-300">{opt}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Barra de información - Métricas de ejercicio */}
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-4 border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="h-4 w-4 text-purple-600" />
                                <span className="font-semibold text-purple-800 dark:text-purple-200 text-sm">{t('generator.metricsTitle')}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div className="flex items-start gap-2">
                                    <Repeat className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <strong className="text-zinc-800 dark:text-zinc-200">{t('generator.sxr')}</strong>
                                        <p className="text-zinc-500">{t('generator.sxrDesc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Clock className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <strong className="text-zinc-800 dark:text-zinc-200">{t('generator.rest')}</strong>
                                        <p className="text-zinc-500">{t('generator.restDesc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Gauge className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <strong className="text-zinc-800 dark:text-zinc-200">{t('generator.rir')}</strong>
                                        <p className="text-zinc-500">{t('generator.rirDesc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Timer className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <strong className="text-zinc-800 dark:text-zinc-200">{t('generator.tempo')}</strong>
                                        <p className="text-zinc-500">{t('generator.tempoDesc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {routine.days.map((day, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden hover:border-purple-200 transition-colors shadow-lg shadow-gray-200/50 dark:shadow-none">
                                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-xs font-bold text-purple-600 uppercase tracking-widest">{t('generator.day')} {idx + 1}</div>
                                        </div>
                                        <h3 className="text-xl font-black text-zinc-900 dark:text-white">{day.dayName}</h3>
                                        <div className="text-sm font-medium text-zinc-500">{day.focus}</div>
                                    </div>

                                    <div className="p-2 flex-1 overflow-y-auto">
                                        {day.exercises.map((exItem, i) => {
                                            // Get gender-appropriate media
                                            const media = getGenderMedia(exItem.exercise, (profile?.gender as 'M' | 'F') || 'M');
                                            return (
                                                <div key={i} className="p-3 mb-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                                    <div className="flex gap-3">
                                                        <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0 relative cursor-pointer hover:opacity-80 transition-opacity"
                                                            onClick={() => setSelectedExercise(exItem)}
                                                        >
                                                            {media?.url ? (
                                                                media.type === 'video' ? (
                                                                    <video
                                                                        src={media.url}
                                                                        className="w-full h-full object-cover"
                                                                        muted
                                                                        loop
                                                                        playsInline
                                                                        onMouseOver={e => e.currentTarget.play()}
                                                                        onMouseOut={e => e.currentTarget.pause()}
                                                                        onError={e => {
                                                                            const target = e.currentTarget;
                                                                            target.style.display = 'none';
                                                                            target.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={media.url}
                                                                        className="w-full h-full object-cover"
                                                                        alt={exItem.exercise.title}
                                                                        onError={e => {
                                                                            const target = e.currentTarget;
                                                                            target.style.display = 'none';
                                                                            target.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                                                        }}
                                                                    />
                                                                )
                                                            ) : null}
                                                            <div className={`fallback-icon w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-violet-200 dark:from-purple-900/40 dark:to-violet-900/40 ${media?.url ? 'hidden absolute inset-0' : ''}`}>
                                                                <DumbbellIcon className="w-8 h-8 text-purple-500 dark:text-purple-400" />
                                                            </div>
                                                            <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 font-bold">
                                                                {i + 1}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-zinc-900 dark:text-white text-sm truncate leading-tight">
                                                                {exItem.exercise.title}
                                                            </h4>

                                                            {/* Smart Prescription */}
                                                            <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                                                                <div className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-help" title="{t('generator.sxrDesc')}">
                                                                    <Repeat className="h-3 w-3 text-purple-600" />
                                                                    <span className="font-bold text-purple-600">{t('generator.sxr')}</span> {exItem.sets} x {exItem.reps}
                                                                </div>
                                                                <div className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-help" title="{t('generator.restDesc')}">
                                                                    <Clock className="h-3 w-3 text-gray-500" /> {exItem.rest}
                                                                </div>
                                                                <div className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-help" title="{t('generator.rirDesc')}">
                                                                    <Gauge className="h-3 w-3" /> {t('generator.rir')} {exItem.rir}
                                                                </div>
                                                                {exItem.tempo && (
                                                                    <div className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-help" title="{t('generator.tempoDesc')}: 2-0-1-0">
                                                                        <Timer className="h-3 w-3" /> {exItem.tempo}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Reasoning */}
                                                    <div className="mt-2 ml-[76px] text-[10px] text-zinc-400 border-l-2 border-purple-200 pl-2">
                                                        {exItem.reason}
                                                        {exItem.note && <span className="block text-purple-500 font-medium mt-0.5">{exItem.note}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}


                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Exercise Image Modal */}
                {selectedExercise && (
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                        onClick={() => setSelectedExercise(null)}
                    >
                        <div
                            className="bg-white dark:bg-gray-900 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-4">{selectedExercise.exercise.title}</h2>

                                {(() => {
                                    const modalMedia = getGenderMedia(selectedExercise.exercise, (profile?.gender as 'M' | 'F') || 'M');
                                    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedExercise.exercise.title + ' ejercicio tutorial')}`;

                                    if (modalMedia) {
                                        return (
                                            <div className="mb-4 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                {modalMedia.type === 'video' ? (
                                                    <video src={modalMedia.url} controls className="w-full" />
                                                ) : (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={modalMedia.url} alt={selectedExercise.exercise.title} className="w-full" />
                                                )}
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 p-8 text-center">
                                                <p className="text-gray-400 mb-4">{t('generator.noImage')}</p>
                                                <a
                                                    href={youtubeSearchUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                                    </svg>
                                                    {t('generator.viewOnYoutube')}
                                                </a>
                                            </div>
                                        );
                                    }
                                })()}

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                        <div className="text-xs text-zinc-500 mb-1">{t('generator.sxrDesc')}</div>
                                        <div className="text-lg font-bold text-zinc-900 dark:text-white">{selectedExercise.sets} x {selectedExercise.reps}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                        <div className="text-xs text-zinc-500 mb-1">{t('generator.rest')}</div>
                                        <div className="text-lg font-bold text-zinc-900 dark:text-white">{selectedExercise.rest}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                        <div className="text-xs text-zinc-500 mb-1">{t('generator.rir')}</div>
                                        <div className="text-lg font-bold text-zinc-900 dark:text-white">{selectedExercise.rir}</div>
                                    </div>
                                    {selectedExercise.tempo && (
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                            <div className="text-xs text-zinc-500 mb-1">{t('generator.tempo')}</div>
                                            <div className="text-lg font-bold text-zinc-900 dark:text-white">{selectedExercise.tempo}</div>
                                        </div>
                                    )}
                                </div>

                                {selectedExercise.reason && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                                        <div className="text-sm text-blue-900 dark:text-blue-100">{selectedExercise.reason}</div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setSelectedExercise(null)}
                                    className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold hover:opacity-90 transition-all"
                                >
                                    {t('generator.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
