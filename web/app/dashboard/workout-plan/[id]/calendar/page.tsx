"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Calendar, Check, Plus, Clock, Target, TrendingDown, Sunrise, Sun, Moon, Flame, Dumbbell } from "lucide-react";
import { calculateProjectionWithExercise, calculateBMR, calculateTDEE } from "@/lib/calculations";

interface ScheduledDay {
    id?: number;
    day_of_week: number;
    time_slot: 'morning' | 'afternoon' | 'night';
    routine_day_id: string;
    day_name: string;
    exercises: any[];
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const TIME_SLOTS = {
    morning: { label: 'Mañana', icon: '🌅' },
    afternoon: { label: 'Tarde', icon: '☀️' },
    night: { label: 'Noche', icon: '🌙' }
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
    const [currentDate, setCurrentDate] = useState(new Date());
    const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
    const [selectedDay, setSelectedDay] = useState<ScheduledDay | null>(null);

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

                const exerciseCals = routineData.estimated_calories_weekly || routineData.brain_state?.estimated_calories_weekly || 0;

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

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const getWorkoutForDate = (date: Date | null) => {
        if (!date) return null;
        const dayOfWeek = date.getDay();
        return schedule.find(s => s.day_of_week === dayOfWeek);
    };

    const isToday = (date: Date | null) => {
        if (!date) return false;
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isCompleted = (date: Date | null) => {
        if (!date) return false;
        return completedDates.has(date.toISOString().split('T')[0]);
    };

    const handleToggleComplete = async (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const newCompleted = new Set(completedDates);
        const isCompleting = !newCompleted.has(dateStr);

        if (newCompleted.has(dateStr)) {
            newCompleted.delete(dateStr);
        } else {
            newCompleted.add(dateStr);
        }

        setCompletedDates(newCompleted);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const workout = getWorkoutForDate(date);
        if (workout) {
            if (isCompleting) {
                // Log the first exercise or a general entry
                await supabase.from('daily_logs').upsert({
                    user_id: user.id,
                    log_date: dateStr,
                    exercise_minutes: 60, // Default estimate
                    calories_burned: Math.round((routine?.estimated_calories_weekly || 0) / (routine?.configuration?.daysAvailable || 4))
                }, { onConflict: 'user_id,log_date' });
            } else {
                // Delete the log entry if uncompleting
                await supabase.from('daily_logs')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('log_date', dateStr);
            }
        }
    };

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const daysInMonth = getDaysInMonth(currentDate);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                            <Calendar className="h-7 w-7 text-purple-500" />
                            Calendario de Entrenamiento
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

                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                        <button onClick={previousMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Days of Week */}
                    <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
                        {DAYS.map(day => (
                            <div key={day} className="p-4 text-center font-bold text-sm text-zinc-500 uppercase">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7">
                        {daysInMonth.map((date, idx) => {
                            const workout = getWorkoutForDate(date);
                            const today = isToday(date);
                            const completed = isCompleted(date);

                            return (
                                <div
                                    key={idx}
                                    className={`min-h-[120px] p-3 border-b border-r border-gray-200 dark:border-gray-800 ${!date ? 'bg-gray-50 dark:bg-gray-900/50' : ''
                                        } ${today ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
                                >
                                    {date && (
                                        <>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-sm font-bold ${today ? 'text-purple-600' : 'text-zinc-900 dark:text-white'}`}>
                                                    {date.getDate()}
                                                </span>
                                                {workout && (
                                                    <button
                                                        onClick={() => handleToggleComplete(date)}
                                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${completed
                                                            ? 'bg-green-500 border-green-500'
                                                            : 'border-gray-300 hover:border-green-500'
                                                            }`}
                                                    >
                                                        {completed && <Check className="h-4 w-4 text-white" />}
                                                    </button>
                                                )}
                                            </div>

                                            {workout ? (
                                                <div
                                                    onClick={() => setSelectedDay(workout)}
                                                    className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800/30"
                                                >
                                                    <div className="text-[10px] font-black text-purple-900 dark:text-purple-100 mb-1 truncate uppercase tracking-tighter">
                                                        {workout.day_name}
                                                    </div>
                                                    <div className="text-[10px] text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                                        {TIME_SLOTS[workout.time_slot as keyof typeof TIME_SLOTS].icon}
                                                        <span className="truncate">{workout.exercises.length} ejercicios</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="text-[10px] text-gray-400 text-center py-4 flex flex-col items-center gap-1 group cursor-pointer"
                                                    onClick={() => {/* Open manual add modal if needed */ }}
                                                >
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold tracking-widest text-[8px]">Descanso</span>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-100 dark:bg-gray-800 rounded-full hover:text-purple-500">
                                                        <Plus className="h-3 w-3" />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-500 rounded"></div>
                        <span className="text-zinc-600 dark:text-zinc-400">Hoy</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900/30 rounded"></div>
                        <span className="text-zinc-600 dark:text-zinc-400">Día de entrenamiento</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-zinc-600 dark:text-zinc-400">Completado</span>
                    </div>
                </div>
            </div>

            {selectedDay && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setSelectedDay(null)}>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 text-purple-500 font-bold text-sm uppercase tracking-widest mb-1">
                                        {TIME_SLOTS[selectedDay.time_slot as keyof typeof TIME_SLOTS].icon}
                                        {TIME_SLOTS[selectedDay.time_slot as keyof typeof TIME_SLOTS].label}
                                    </div>
                                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white leading-tight">
                                        {selectedDay.day_name}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setSelectedDay(null)}
                                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"
                                >
                                    <ChevronRight className="h-6 w-6 rotate-90 md:rotate-0" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                {selectedDay.exercises.map((ex: any, idx: number) => (
                                    <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 transition-all hover:border-purple-300 group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center font-black text-purple-600 dark:text-purple-400">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-zinc-900 dark:text-white group-hover:text-purple-500 transition-colors">
                                                    {ex.exercise.title}
                                                </div>
                                                <div className="text-sm text-zinc-500 flex gap-3 mt-1">
                                                    <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" /> {ex.sets} x {ex.reps}</span>
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {ex.rest}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Intensidad</span>
                                                <span className="text-xs font-black text-zinc-600 dark:text-zinc-300">RIR {ex.rir || 2}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setSelectedDay(null)} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-lg transition-all shadow-lg shadow-purple-200 dark:shadow-none">
                                Listo por hoy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
