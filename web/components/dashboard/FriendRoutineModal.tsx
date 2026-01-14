import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Calendar, Dumbbell, Clock, ChevronRight } from "lucide-react";
import { WorkoutPlan } from "@/types";

interface FriendRoutineModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: WorkoutPlan | null;
    friendName: string;
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// DB Indices: Mon->1, Tue->2, ... Sun->0
const DB_INDICES = [1, 2, 3, 4, 5, 6, 0];

export default function FriendRoutineModal({ isOpen, onClose, plan, friendName }: FriendRoutineModalProps) {
    const [loading, setLoading] = useState(true);
    const [weeklySchedule, setWeeklySchedule] = useState<any[]>(new Array(7).fill(null));
    const [error, setError] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<any | null>(null);

    useEffect(() => {
        if (isOpen && plan) {
            loadRoutineDetails();
        } else {
            setWeeklySchedule(new Array(7).fill(null));
            setSelectedDay(null);
        }
    }, [isOpen, plan]);

    const loadRoutineDetails = async () => {
        if (!plan) return;
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();

            // 1. Check if we have a source_routine_id (created from template)
            // If not, we might need to look at workout_exercises directly if user created custom plan manually (future proofing)
            // For now, based on calendar/page.tsx, let's assume structure follows saved_routines if source_routine_id exists, 
            // but we might need to handle manual plans differently.

            // Let's first try to get the saved_routine if it exists
            let routineData = null;

            // Note: The specific field for source routine might need to be verified in schema, 
            // but based on calendar/page.tsx it seems to query 'workout_plans' to get it.
            // Since we passed 'plan', let's trust it has the fields.
            // Extend type locally if needed since standard type might be missing it
            const sourceRoutineId = (plan as any).source_routine_id;

            if (sourceRoutineId) {
                const { data } = await supabase
                    .from('saved_routines')
                    .select('*')
                    .eq('id', sourceRoutineId)
                    .single();
                routineData = data;
            }

            if (routineData) {
                // Logic from calendar/page.tsx to build weekly schedule
                const schedule = new Array(7).fill(null);

                // Try fetching user specific schedule override first
                const { data: userSchedule } = await supabase
                    .from('user_schedule')
                    .select('*')
                    .eq('saved_routine_id', sourceRoutineId)
                    .order('day_of_week');

                if (userSchedule && userSchedule.length > 0) {
                    userSchedule.forEach((day: any) => {
                        // Map day_of_week (0-6) to our array index (0=Mon, 6=Sun)
                        // DB: 0=Sun, 1=Mon... 6=Sat. 
                        // Our Array: 0=Mon, ... 5=Sat, 6=Sun
                        let arrayIndex = day.day_of_week === 0 ? 6 : day.day_of_week - 1;

                        // Hydrate with exercise details from template
                        const templateDay = routineData.schedule.days.find((d: any) => d.id === day.routine_day_id);

                        schedule[arrayIndex] = {
                            ...day,
                            day_name: templateDay?.dayName || 'Entrenamiento',
                            exercises: templateDay?.exercises || []
                        };
                    });
                } else if (routineData.recommended_schedule && routineData.schedule?.days) {
                    // Fallback to recommended schedule
                    // recommended_schedule array matches indices: 0=Mon, 1=Tue... (Wait, need to verify this assumption)
                    // In calendar/page.tsx:
                    // const dbDayIndices = [1, 2, 3, 4, 5, 6, 0]; // Mon->1, Tue->2...
                    // Loop i from 0 to recommended_schedule.length (7)
                    // If i=0, dbIndex=1 (Mon). So recommended_schedule[0] IS Monday.

                    let routineDayCounter = 0;
                    for (let i = 0; i < 7; i++) {
                        const activity = routineData.recommended_schedule[i];
                        if (activity !== 'Rest') {
                            const templateDay = routineData.schedule.days[routineDayCounter % routineData.schedule.days.length];
                            schedule[i] = { // i=0 is Mon, matches our array
                                day_name: templateDay?.dayName || activity,
                                exercises: templateDay?.exercises || [],
                                time_slot: 'morning' // Default/Placeholder
                            };
                            routineDayCounter++;
                        }
                    }
                }

                setWeeklySchedule(schedule);
            }

            // If routineData lookup failed (e.g. deleted source routine) but we have a plan, 
            // OR if we didn't have a source_routine_id to begin with, try fetching exercises directly.
            if (!routineData) {
                // Fetch from workout_plan_exercises table
                const { data: exercises } = await supabase
                    .from('workout_plan_exercises')
                    .select('*, exercise:exercises(*)')
                    .eq('workout_plan_id', plan.id)
                    .order('day_of_week')
                    .order('order_in_day');

                if (exercises && exercises.length > 0) {
                    const schedule = new Array(7).fill(null);

                    exercises.forEach((ex: any) => {
                        // Assumption: day_of_week in workout_plan_exercises is often 1-based (Mon=1 ... Sun=7)
                        // But need to be careful. Let's assume standard ISO: 1=Mon, 7=Sun.
                        // Our array is 0=Mon, 6=Sun.
                        let arrayIndex = ex.day_of_week - 1;

                        // Handle potential 0=Sun case if data is mixed
                        if (ex.day_of_week === 0) arrayIndex = 6;

                        if (arrayIndex >= 0 && arrayIndex < 7) {
                            if (!schedule[arrayIndex]) {
                                schedule[arrayIndex] = {
                                    day_name: `Día ${ex.day_of_week}`,
                                    exercises: [],
                                    time_slot: 'any'
                                };
                            }
                            schedule[arrayIndex].exercises.push({
                                exercise: ex.exercise,
                                sets: ex.sets,
                                reps: ex.reps,
                                rest: ex.rest_seconds ? `${ex.rest_seconds}s` : '-'
                            });
                        }
                    });
                    setWeeklySchedule(schedule);
                } else {
                    setError("No se pudo cargar los detalles de la rutina.");
                }
            }
        } catch (err) {
            console.error("Error fetching routine details:", err);
            setError("Error al cargar la rutina.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-gray-800">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900 dark:text-white flex items-center gap-2">
                                            <Calendar className="h-5 w-5 text-purple-500" />
                                            Rutina de {friendName}
                                        </Dialog.Title>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {plan?.name || "Rutina Actual"} • {plan?.days_per_week} días/semana
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <X className="h-5 w-5 text-gray-500" />
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-10 text-gray-500">
                                        {error}
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row gap-6 h-[500px]">
                                        {/* Weekly Grid (Left side) */}
                                        <div className="w-full md:w-1/3 flex flex-col gap-2 overflow-y-auto pr-2">
                                            {DAYS.map((dayName, idx) => {
                                                const dayData = weeklySchedule[idx];
                                                const isSelected = selectedDay === dayData && dayData !== null;

                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => dayData && setSelectedDay(dayData)}
                                                        className={`p-4 rounded-xl border transition-all cursor-${dayData ? 'pointer' : 'default'} relative overflow-hidden group 
                                                            ${isSelected
                                                                ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-200 dark:ring-purple-900'
                                                                : dayData
                                                                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                                                                    : 'bg-gray-50 dark:bg-gray-900/50 border-transparent opacity-60'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className={`font-bold text-sm ${isSelected ? 'text-purple-100' : 'text-gray-400'}`}>{dayName}</span>
                                                            {dayData && (
                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isSelected ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                                                    {dayData.exercises.length} ej.
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={`mt-2 font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                            {dayData ? dayData.day_name : 'Descanso'}
                                                        </div>

                                                        {dayData && (
                                                            <ChevronRight className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Detail View (Right side) */}
                                        <div className="w-full md:w-2/3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 overflow-y-auto">
                                            {selectedDay ? (
                                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center font-bold text-purple-600 dark:text-purple-400">
                                                            {selectedDay.exercises.length}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                                                                {selectedDay.day_name}
                                                            </h4>
                                                            <p className="text-sm text-gray-500">Detalles de la sesión</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {selectedDay.exercises.map((ex: any, i: number) => (
                                                            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                                                <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xs">
                                                                    {i + 1}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                                        {ex.exercise?.title || "Ejercicio desconocido"}
                                                                    </div>
                                                                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                                        <span className="flex items-center gap-1">
                                                                            <Dumbbell className="h-3 w-3" /> {ex.sets} series x {ex.reps || "Fallo"} reps
                                                                        </span>
                                                                        {ex.rest && (
                                                                            <span className="flex items-center gap-1">
                                                                                <Clock className="h-3 w-3" /> {ex.rest} descanso
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
                                                    <Calendar className="h-16 w-16 text-gray-200 dark:text-gray-700 mb-4" />
                                                    <p className="font-medium text-lg text-gray-500">Selecciona un día para ver los detalles</p>
                                                    <p className="text-sm">Explora cómo organiza {friendName} su semana de entrenamiento.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
