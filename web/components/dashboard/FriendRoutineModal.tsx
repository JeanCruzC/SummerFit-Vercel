import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Calendar, Dumbbell, Clock, ChevronRight, Flame, Zap, Moon } from "lucide-react";
import { WorkoutPlan } from "@/types";

interface FriendRoutineModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: WorkoutPlan | null;
    friendName: string;
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DB_INDICES = [1, 2, 3, 4, 5, 6, 0];

// Workout type color/icon mapping
const WORKOUT_STYLES: Record<string, { gradient: string; icon: any; label: string }> = {
    'upper': { gradient: 'from-blue-500 to-cyan-500', icon: Dumbbell, label: 'Upper' },
    'lower': { gradient: 'from-orange-500 to-red-500', icon: Flame, label: 'Lower' },
    'push': { gradient: 'from-purple-500 to-pink-500', icon: Zap, label: 'Push' },
    'pull': { gradient: 'from-emerald-500 to-teal-500', icon: Dumbbell, label: 'Pull' },
    'full': { gradient: 'from-violet-500 to-purple-600', icon: Flame, label: 'Full Body' },
    'default': { gradient: 'from-gray-500 to-gray-600', icon: Dumbbell, label: 'Entrenamiento' }
};

function getWorkoutStyle(dayName: string) {
    const nameLower = dayName?.toLowerCase() || '';
    if (nameLower.includes('upper') || nameLower.includes('superior')) return WORKOUT_STYLES['upper'];
    if (nameLower.includes('lower') || nameLower.includes('inferior') || nameLower.includes('pierna')) return WORKOUT_STYLES['lower'];
    if (nameLower.includes('push') || nameLower.includes('empuje')) return WORKOUT_STYLES['push'];
    if (nameLower.includes('pull') || nameLower.includes('tirón')) return WORKOUT_STYLES['pull'];
    if (nameLower.includes('full') || nameLower.includes('completo')) return WORKOUT_STYLES['full'];
    return WORKOUT_STYLES['default'];
}

export default function FriendRoutineModal({ isOpen, onClose, plan, friendName }: FriendRoutineModalProps) {
    const [loading, setLoading] = useState(true);
    const [weeklySchedule, setWeeklySchedule] = useState<any[]>(new Array(7).fill(null));
    const [error, setError] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<any | null>(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen && plan) {
            loadRoutineDetails();
        } else {
            setWeeklySchedule(new Array(7).fill(null));
            setSelectedDay(null);
            setSelectedDayIndex(null);
        }
    }, [isOpen, plan]);

    const loadRoutineDetails = async () => {
        if (!plan) return;
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            let routineData = null;
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
                const schedule = new Array(7).fill(null);

                const { data: userSchedule } = await supabase
                    .from('user_schedule')
                    .select('*')
                    .eq('saved_routine_id', sourceRoutineId)
                    .order('day_of_week');

                if (userSchedule && userSchedule.length > 0) {
                    userSchedule.forEach((day: any) => {
                        let arrayIndex = day.day_of_week === 0 ? 6 : day.day_of_week - 1;
                        const templateDay = routineData.schedule.days.find((d: any) => d.id === day.routine_day_id);

                        schedule[arrayIndex] = {
                            ...day,
                            day_name: templateDay?.dayName || 'Entrenamiento',
                            focus: templateDay?.focus || '',
                            exercises: templateDay?.exercises || []
                        };
                    });
                } else if (routineData.recommended_schedule && routineData.schedule?.days) {
                    let routineDayCounter = 0;
                    for (let i = 0; i < 7; i++) {
                        const activity = routineData.recommended_schedule[i];
                        if (activity !== 'Rest') {
                            const templateDay = routineData.schedule.days[routineDayCounter % routineData.schedule.days.length];
                            schedule[i] = {
                                day_name: templateDay?.dayName || activity,
                                focus: templateDay?.focus || '',
                                exercises: templateDay?.exercises || [],
                                time_slot: 'morning'
                            };
                            routineDayCounter++;
                        }
                    }
                }

                setWeeklySchedule(schedule);
            }

            if (!routineData) {
                const { data: exercises } = await supabase
                    .from('workout_plan_exercises')
                    .select('*, exercise:exercises(*)')
                    .eq('workout_plan_id', plan.id)
                    .order('day_of_week')
                    .order('order_in_day');

                if (exercises && exercises.length > 0) {
                    const schedule = new Array(7).fill(null);
                    const dayGroups: Record<number, any[]> = {};

                    exercises.forEach((ex: any) => {
                        let arrayIndex = ex.day_of_week - 1;
                        if (ex.day_of_week === 0) arrayIndex = 6;
                        if (!dayGroups[arrayIndex]) dayGroups[arrayIndex] = [];
                        dayGroups[arrayIndex].push(ex);
                    });

                    Object.entries(dayGroups).forEach(([idx, exs]) => {
                        const arrayIndex = parseInt(idx);
                        // Determine workout type from exercise primary muscles
                        const muscles = exs.map(e => e.exercise?.primary_muscles || []).flat();
                        let workoutType = 'Entrenamiento';
                        if (muscles.some((m: string) => ['pecho', 'hombros', 'tríceps', 'chest', 'shoulders', 'triceps'].includes(m?.toLowerCase()))) {
                            workoutType = 'Upper / Push';
                        } else if (muscles.some((m: string) => ['espalda', 'bíceps', 'back', 'biceps'].includes(m?.toLowerCase()))) {
                            workoutType = 'Upper / Pull';
                        } else if (muscles.some((m: string) => ['piernas', 'cuádriceps', 'glúteos', 'legs', 'quads', 'glutes'].includes(m?.toLowerCase()))) {
                            workoutType = 'Lower Body';
                        }

                        schedule[arrayIndex] = {
                            day_name: workoutType,
                            focus: `${exs.length} ejercicios`,
                            exercises: exs.map(e => ({
                                exercise: e.exercise,
                                sets: e.sets,
                                reps: e.reps,
                                rest: e.rest_seconds ? `${e.rest_seconds}s` : '-'
                            }))
                        };
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

    const handleDaySelect = (dayData: any, idx: number) => {
        if (dayData) {
            setSelectedDay(dayData);
            setSelectedDayIndex(idx);
        }
    };

    const workoutDays = weeklySchedule.filter(d => d !== null).length;
    const totalExercises = weeklySchedule.reduce((sum, d) => sum + (d?.exercises?.length || 0), 0);

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
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-md" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-90"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-90"
                        >
                            <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-3xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-2xl transition-all border border-gray-200/50 dark:border-gray-800/50">
                                {/* Premium Header */}
                                <div className="relative bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 p-6 pb-16">
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2Mkgy NHYtMmgxMnptMC00djJIMjR2LTJoMTJ6TTI0IDE0aDEydjJIMjR2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                    >
                                        <X className="h-5 w-5 text-white" />
                                    </button>
                                    <div className="relative">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                                                <Calendar className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <Dialog.Title as="h3" className="text-2xl font-black text-white">
                                                    Rutina de {friendName}
                                                </Dialog.Title>
                                                <p className="text-purple-100 text-sm">
                                                    {plan?.name || "Rutina Actual"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Bar */}
                                <div className="relative -mt-8 mx-6 mb-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-around">
                                        <div className="text-center">
                                            <div className="text-2xl font-black text-purple-600">{workoutDays}</div>
                                            <div className="text-xs text-gray-500 font-medium">Días/Semana</div>
                                        </div>
                                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                                        <div className="text-center">
                                            <div className="text-2xl font-black text-orange-500">{totalExercises}</div>
                                            <div className="text-xs text-gray-500 font-medium">Ejercicios</div>
                                        </div>
                                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                                        <div className="text-center">
                                            <div className="text-2xl font-black text-emerald-500">~{Math.round((plan?.estimated_calories_weekly || 0) / 7)}</div>
                                            <div className="text-xs text-gray-500 font-medium">kcal/día</div>
                                        </div>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-16 text-gray-500 px-6">
                                        <Moon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                                        <p className="font-medium">{error}</p>
                                    </div>
                                ) : (
                                    <div className="p-6 pt-2">
                                        <div className="flex flex-col lg:flex-row gap-6 min-h-[400px]">
                                            {/* Weekly Grid */}
                                            <div className="w-full lg:w-2/5 space-y-2">
                                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Semana de Entrenamiento</h4>
                                                {DAYS.map((dayName, idx) => {
                                                    const dayData = weeklySchedule[idx];
                                                    const isSelected = selectedDayIndex === idx && dayData !== null;
                                                    const style = dayData ? getWorkoutStyle(dayData.day_name) : null;
                                                    const IconComponent = style?.icon || Dumbbell;

                                                    return (
                                                        <div
                                                            key={idx}
                                                            onClick={() => handleDaySelect(dayData, idx)}
                                                            className={`relative overflow-hidden rounded-xl transition-all duration-200 ${dayData ? 'cursor-pointer group' : 'cursor-default'} 
                                                                ${isSelected
                                                                    ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-900'
                                                                    : ''
                                                                }`}
                                                        >
                                                            <div className={`p-4 flex items-center gap-4 
                                                                ${dayData
                                                                    ? `bg-gradient-to-r ${style?.gradient} ${isSelected ? '' : 'opacity-90 hover:opacity-100'}`
                                                                    : 'bg-gray-100 dark:bg-gray-800/50 opacity-60'
                                                                }`}
                                                            >
                                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${dayData ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                                                    {dayData ? (
                                                                        <IconComponent className="h-5 w-5 text-white" />
                                                                    ) : (
                                                                        <Moon className="h-5 w-5 text-gray-400" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className={`text-xs font-bold uppercase tracking-wider ${dayData ? 'text-white/70' : 'text-gray-400'}`}>
                                                                        {DAYS_FULL[idx]}
                                                                    </div>
                                                                    <div className={`font-bold truncate ${dayData ? 'text-white' : 'text-gray-500'}`}>
                                                                        {dayData ? dayData.day_name : 'Descanso'}
                                                                    </div>
                                                                </div>
                                                                {dayData && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                                                            {dayData.exercises.length} ej.
                                                                        </span>
                                                                        <ChevronRight className={`h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform`} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Detail View */}
                                            <div className="w-full lg:w-3/5">
                                                <div className="bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-200 dark:border-gray-800 h-full min-h-[400px] overflow-hidden">
                                                    {selectedDay ? (
                                                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                                                            {/* Detail Header */}
                                                            <div className={`bg-gradient-to-r ${getWorkoutStyle(selectedDay.day_name).gradient} p-5`}>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                                                                        {(() => {
                                                                            const Icon = getWorkoutStyle(selectedDay.day_name).icon;
                                                                            return <Icon className="h-7 w-7 text-white" />;
                                                                        })()}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xl font-black text-white">
                                                                            {selectedDay.day_name}
                                                                        </h4>
                                                                        <p className="text-white/80 text-sm">
                                                                            {DAYS_FULL[selectedDayIndex!]} • {selectedDay.exercises.length} ejercicios
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Exercises List */}
                                                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                                                {selectedDay.exercises.map((ex: any, i: number) => (
                                                                    <div
                                                                        key={i}
                                                                        className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                                                                    >
                                                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-sm flex-shrink-0">
                                                                            {i + 1}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-bold text-gray-900 dark:text-white truncate">
                                                                                {ex.exercise?.title || "Ejercicio"}
                                                                            </div>
                                                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                                                <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-full">
                                                                                    <Dumbbell className="h-3 w-3" />
                                                                                    <span className="font-medium">{ex.sets} × {ex.reps || "Fallo"}</span>
                                                                                </span>
                                                                                {ex.rest && ex.rest !== '-' && (
                                                                                    <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-full">
                                                                                        <Clock className="h-3 w-3" />
                                                                                        <span className="font-medium">{ex.rest}</span>
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
                                                            <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                                                <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                                                            </div>
                                                            <p className="font-bold text-lg text-gray-500 dark:text-gray-400">Selecciona un día</p>
                                                            <p className="text-sm max-w-xs">
                                                                Haz clic en cualquier día de entrenamiento para ver los ejercicios de {friendName}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
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
