"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Clock, Check, Plus, Sunrise, Sun, Moon, Flame, BarChart3, Timer, Activity, Target, TrendingDown } from "lucide-react";
import { calculateProjectionWithExercise, calculateBMR, calculateTDEE } from "@/lib/calculations";

interface ScheduledDay {
    id?: number;
    day_of_week: number;
    time_slot: 'morning' | 'afternoon' | 'night';
    routine_day_id: string;
    day_name: string;
    exercises: any[];
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TIME_SLOTS = {
    morning: { label: 'Mañana', icon: Sunrise, time: '6:00 - 12:00' },
    afternoon: { label: 'Tarde', icon: Sun, time: '12:00 - 18:00' },
    night: { label: 'Noche', icon: Moon, time: '18:00 - 23:00' }
};

export default function WorkoutCalendarPage() {
    const router = useRouter();
    const params = useParams();
    const planId = params?.id;

    const [loading, setLoading] = useState(true);
    const [schedule, setSchedule] = useState<ScheduledDay[]>([]);
    const [routine, setRoutine] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [projection, setProjection] = useState<any>(null);
    const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
    const [selectedExercise, setSelectedExercise] = useState<any>(null);

    useEffect(() => {
        loadSchedule();
    }, [planId]);

    const loadSchedule = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: routineData } = await supabase
            .from('saved_routines')
            .select('*')
            .eq('id', planId)
            .single();

        if (routineData) {
            setRoutine(routineData);

            const { data: scheduleData } = await supabase
                .from('user_schedule')
                .select('*')
                .eq('saved_routine_id', planId)
                .order('day_of_week');

            const scheduledDays = (scheduleData || []).map(s => {
                const routineDay = routineData.schedule.days.find((d: any) => d.id === s.routine_day_id);
                return {
                    ...s,
                    day_name: routineDay?.dayName || 'Día',
                    exercises: routineDay?.exercises || []
                };
            });

            setSchedule(scheduledDays);

            // Fetch Profile & Calculate Projection
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (profileData && routineData) {
                setProfile(profileData);
                const bmr = calculateBMR(profileData.weight_kg, profileData.height_cm, profileData.age, profileData.gender);
                const tdee = calculateTDEE(bmr, profileData.activity_level);

                // Get exercise calories from brain_state or root
                const exerciseCals = routineData.brain_state?.estimated_calories_weekly || routineData.estimated_calories_per_session?.weekly || 0;

                const proj = calculateProjectionWithExercise(
                    profileData.weight_kg,
                    profileData.target_weight_kg,
                    tdee,
                    bmr,
                    profileData.goal === 'Definir' ? 'Definir' : profileData.goal === 'Volumen' ? 'Volumen' : 'Mantener',
                    'moderado',
                    exerciseCals
                );
                setProjection(proj);
            }
        }

        setLoading(false);
    };

    const handleAddSchedule = async (dayOfWeek: number, timeSlot: string) => {
        if (!routine) return;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const nextDayIndex = schedule.length % routine.schedule.days.length;
        const routineDay = routine.schedule.days[nextDayIndex];

        const { error } = await supabase
            .from('user_schedule')
            .insert({
                user_id: user.id,
                day_of_week: dayOfWeek,
                time_slot: timeSlot,
                saved_routine_id: planId,
                routine_day_id: routineDay.id
            });

        if (!error) loadSchedule();
    };

    const handleToggleComplete = async (exerciseId: string, exercise: any) => {
        const isCompleting = !completedToday.has(exerciseId);

        setCompletedToday(prev => {
            const newSet = new Set(prev);
            if (newSet.has(exerciseId)) {
                newSet.delete(exerciseId);
            } else {
                newSet.add(exerciseId);
            }
            return newSet;
        });

        if (isCompleting) {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.from('workout_logs').insert({
                user_id: user.id,
                exercise_id: exercise.exercise.id,
                date: new Date().toISOString(),
                sets_data: Array(exercise.sets).fill({ weight: 0, reps: 0, rir: 2 }),
                rpe_rating: 7
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const today = new Date().getDay();
    const todaySchedule = schedule.filter(s => s.day_of_week === today);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                            <Calendar className="h-7 w-7 text-purple-500" />
                            Calendario Semanal
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                            {routine?.name || 'Mi Rutina'}
                        </p>
                    </div>

                    {projection && (
                        <div className="flex flex-col items-end text-right">
                            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-black text-lg">
                                <Target className="h-5 w-5 text-purple-500" />
                                <span>Fecha Objetivo: {projection.target_date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-500 text-sm font-bold">
                                <TrendingDown className="h-4 w-4 text-green-500" />
                                <span>Ritmo: {projection.weekly_rate} kg/semana</span>
                            </div>
                            <div className="text-[10px] text-purple-600 font-bold uppercase tracking-widest mt-1">
                                Faltan {projection.weeks} semanas para tu meta
                            </div>
                        </div>
                    )}
                </div>

                {todaySchedule.length > 0 && (
                    <div className="mb-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-6 text-white shadow-2xl">
                        <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                            <Flame className="h-6 w-6 text-orange-500" /> Hoy: {DAYS[today]}
                        </h2>
                        {todaySchedule.map((day, idx) => (
                            <div key={idx} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    {day.time_slot === 'morning' && <Sunrise className="h-5 w-5" />}
                                    {day.time_slot === 'afternoon' && <Sun className="h-5 w-5" />}
                                    {day.time_slot === 'night' && <Moon className="h-5 w-5" />}
                                    <span className="font-bold">{TIME_SLOTS[day.time_slot].label}</span>
                                    <span className="text-sm opacity-75">{TIME_SLOTS[day.time_slot].time}</span>
                                </div>
                                <h3 className="text-lg font-bold mb-3">{day.day_name}</h3>
                                <div className="space-y-2">
                                    {day.exercises.map((ex: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-all">
                                            <div
                                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${completedToday.has(`${day.id}-${i}`) ? 'bg-green-500 border-green-500' : 'border-white/50'}`}
                                                onClick={() => handleToggleComplete(`${day.id}-${i}`, ex)}
                                            >
                                                {completedToday.has(`${day.id}-${i}`) && <Check className="h-4 w-4" />}
                                            </div>
                                            <div className="flex-1" onClick={() => setSelectedExercise(ex)}>
                                                <div className="font-bold">{ex.exercise.title}</div>
                                                <div className="text-sm opacity-75">{ex.sets} x {ex.reps} • {ex.rest}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {DAYS.map((dayName, dayIndex) => {
                        const daySchedule = schedule.filter(s => s.day_of_week === dayIndex);
                        const isToday = dayIndex === today;

                        return (
                            <div
                                key={dayIndex}
                                className={`bg-white dark:bg-gray-900 rounded-2xl p-4 border-2 ${isToday ? 'border-purple-500 ring-4 ring-purple-50' : 'border-gray-200 dark:border-gray-800'
                                    }`}
                            >
                                <div className="text-center mb-3">
                                    <div className="text-xs font-bold text-zinc-500 uppercase">{dayName}</div>
                                    {isToday && <div className="text-xs text-purple-600 font-bold">HOY</div>}
                                </div>

                                <div className="space-y-2">
                                    {daySchedule.map((day, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                        >
                                            <div className="text-xs text-zinc-500 mb-1">
                                                {day.time_slot === 'morning' && <Sunrise className="inline h-3 w-3 mr-1" />}
                                                {day.time_slot === 'afternoon' && <Sun className="inline h-3 w-3 mr-1" />}
                                                {day.time_slot === 'night' && <Moon className="inline h-3 w-3 mr-1" />}
                                                {TIME_SLOTS[day.time_slot].label}
                                            </div>
                                            <div className="font-bold text-sm text-zinc-900 dark:text-white">
                                                {day.day_name}
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-1">
                                                {day.exercises.length} ejercicios
                                            </div>
                                        </div>
                                    ))}

                                    {daySchedule.length === 0 && (
                                        <button
                                            onClick={() => handleAddSchedule(dayIndex, 'morning')}
                                            className="w-full py-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Agregar
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedExercise && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedExercise(null)}>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-4">{selectedExercise.exercise.title}</h2>

                            {selectedExercise.exercise.exercise_media?.[0] && (
                                <div className="mb-4 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                    {selectedExercise.exercise.exercise_media[0].type === 'video' ? (
                                        <video src={selectedExercise.exercise.exercise_media[0].url} controls className="w-full" />
                                    ) : (
                                        <img src={selectedExercise.exercise.exercise_media[0].url} alt={selectedExercise.exercise.title} className="w-full" />
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                    <div className="text-xs text-zinc-500 mb-1">Series x Reps</div>
                                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{selectedExercise.sets} x {selectedExercise.reps}</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                    <div className="text-xs text-zinc-500 mb-1">Descanso</div>
                                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{selectedExercise.rest}</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                    <div className="text-xs text-zinc-500 mb-1">RIR</div>
                                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{selectedExercise.rir}</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                    <div className="text-xs text-zinc-500 mb-1">Tempo</div>
                                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{selectedExercise.tempo}</div>
                                </div>
                            </div>

                            {selectedExercise.reason && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                                    <div className="text-sm text-blue-900 dark:text-blue-100">{selectedExercise.reason}</div>
                                </div>
                            )}

                            <button onClick={() => setSelectedExercise(null)} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold hover:opacity-90 transition-all">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
