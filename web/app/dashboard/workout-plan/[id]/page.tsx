"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Clock, Flame, ChevronRight, Search, Zap, Save, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
    getWorkoutPlanExercises,
    addExerciseToWorkoutPlan,
    removeExerciseFromWorkoutPlan,
    updateWorkoutPlanExercise,
    updateWorkoutPlan,
    getExercisesByEquipment,
    getUserEquipment // To filter searches
} from "@/lib/supabase/exercises";

import type { WorkoutPlan, WorkoutPlanExercise, Exercise } from "@/types";

// Mock plan fetcher for now, assuming param ID is passed
export default function PlanEditorPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const planId = parseInt(params.id);

    const [loading, setLoading] = useState(true);
    const [exercises, setExercises] = useState<WorkoutPlanExercise[]>([]);
    const [planDetails, setPlanDetails] = useState<WorkoutPlan | null>(null);

    // Exercise Picker State
    const [showPicker, setShowPicker] = useState(false);
    const [selectedDay, setSelectedDay] = useState(1);
    const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // User stats for calorie calcs
    const [userWeight, setUserWeight] = useState(70);

    useEffect(() => {
        loadData();
    }, [planId]);

    const loadData = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push("/login");

        try {
            // 1. Get Plan Details (simple fetch from table)
            const { data: plan } = await supabase
                .from('workout_plans')
                .select('*')
                .eq('id', planId)
                .single();

            if (!plan) return router.push("/dashboard/workout-plan");
            setPlanDetails(plan);

            // 2. Get User Weight (for calculations)
            const { data: profile } = await supabase
                .from('profiles')
                .select('weight_kg')
                .eq('user_id', user.id)
                .single();
            if (profile) setUserWeight(profile.weight_kg);

            // 3. Get Plan Exercises
            const planExercises = await getWorkoutPlanExercises(planId);
            setExercises(planExercises);

            // 4. Pre-load available exercises (filtered by equipment)
            const equipment = await getUserEquipment(user.id);
            const available = await getExercisesByEquipment(equipment);
            setAvailableExercises(available);

        } catch (error) {
            console.error("Error loading plan:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExercise = async (exercise: Exercise) => {
        if (!planDetails) return;

        try {
            // Find max order for this day
            const dayExercises = exercises.filter(e => e.day_of_week === selectedDay);
            const maxOrder = dayExercises.length > 0
                ? Math.max(...dayExercises.map(e => e.order_in_day))
                : 0;

            const newExercise = await addExerciseToWorkoutPlan({
                workout_plan_id: planId,
                exercise_id: exercise.id,
                day_of_week: selectedDay,
                sets: 3, // Default
                reps: 10,
                rest_seconds: 60,
                duration_minutes: 5, // Estimate
                order_in_day: maxOrder + 1,
            });

            // Optimistic update with exercise details joined
            const joinedExercise = { ...newExercise, exercise };
            setExercises([...exercises, joinedExercise]);
            setShowPicker(false);

            // Update totals in background
            updatePlanTotals([...exercises, joinedExercise]);

        } catch (error) {
            console.error("Add error:", error);
        }
    };

    const handleUpdateStats = async (id: number, updates: Partial<WorkoutPlanExercise>) => {
        // Optimistic update
        const updatedExercises = exercises.map(e =>
            e.id === id ? { ...e, ...updates } : e
        );
        setExercises(updatedExercises);

        // Debounced save could go here, but for now direct save
        try {
            await updateWorkoutPlanExercise(id, updates);
            updatePlanTotals(updatedExercises);
        } catch (error) {
            console.error("Update error:", error);
        }
    };

    const handleRemove = async (id: number) => {
        if (!confirm("¿Eliminar ejercicio?")) return;
        try {
            await removeExerciseFromWorkoutPlan(id);
            const remaining = exercises.filter(e => e.id !== id);
            setExercises(remaining);
            updatePlanTotals(remaining);
        } catch (error) {
            console.error("Remove error:", error);
        }
    };

    const updatePlanTotals = async (currentExercises: WorkoutPlanExercise[]) => {
        let totalMetHours = 0;
        let totalCalories = 0;

        currentExercises.forEach(ex => {
            const met = ex.exercise?.met || 0;
            // Duration is usually per set or total? Let's assume duration_minutes is TOTAL for the exercise
            // Or calculate: sets * avg_rep_time?
            // For simplicity: verify if we use duration_minutes as total time
            // Default we set duration_minutes = 5. User can edit.
            const hours = (ex.duration_minutes || 0) / 60;
            totalMetHours += met * hours;
            totalCalories += met * userWeight * hours;
        });

        try {
            await updateWorkoutPlan(planId, {
                total_met_hours: totalMetHours,
                estimated_calories_weekly: Math.round(totalCalories)
            });
            // Update local state header
            setPlanDetails(prev => prev ? ({
                ...prev,
                total_met_hours: totalMetHours,
                estimated_calories_weekly: Math.round(totalCalories)
            }) : null);
        } catch (e) {
            console.log("Error updating totals", e);
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando editor...</div>;
    if (!planDetails) return <div className="p-10 text-center">Plan no encontrado</div>;

    const filteredPickerExercises = availableExercises.filter(ex =>
        searchQuery === "" ||
        ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.body_part?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-zinc-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-zinc-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full">
                            <ArrowLeft className="h-6 w-6 text-zinc-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900">{planDetails.name}</h1>
                            <div className="flex items-center gap-4 text-sm text-zinc-500">
                                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {planDetails.total_met_hours.toFixed(1)}h MET</span>
                                <span className="flex items-center gap-1"><Flame className="h-4 w-4 text-coral-500" /> {Math.round(planDetails.estimated_calories_weekly)} kcal/sem</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/workout-plan')}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-bold text-sm hover:bg-zinc-700"
                    >
                        Guardar y Salir
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Days Tabs/Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                    {/* We show all days configured in plan */}
                    {Array.from({ length: planDetails.days_per_week }).map((_, i) => {
                        const dayNum = i + 1;
                        const dayExercises = exercises.filter(e => e.day_of_week === dayNum).sort((a, b) => a.order_in_day - b.order_in_day);
                        const dayCalories = dayExercises.reduce((acc, curr) => {
                            const hours = (curr.duration_minutes || 0) / 60;
                            return acc + ((curr.exercise?.met || 0) * userWeight * hours);
                        }, 0);

                        return (
                            <div key={dayNum} className="lg:col-span-3 xl:col-span-2 flex flex-col">
                                <div className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden flex flex-col flex-1 shadow-sm hover:border-emerald-200 transition-colors">
                                    <div className="p-4 bg-zinc-50 border-b border-zinc-100 flex justify-between items-center">
                                        <h3 className="font-black text-zinc-700">Día {dayNum}</h3>
                                        <span className="text-xs font-bold text-coral-500">{Math.round(dayCalories)} kcal</span>
                                    </div>

                                    <div className="p-4 flex-1 space-y-4 min-h-[200px]">
                                        {dayExercises.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm py-8">
                                                <p>Descanso</p>
                                            </div>
                                        ) : (
                                            dayExercises.map((ex) => (
                                                <div key={ex.id} className="group relative bg-white border border-zinc-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-sm text-zinc-900 line-clamp-1" title={ex.exercise?.title}>{ex.exercise?.title}</h4>
                                                        <button onClick={() => ex.id && handleRemove(ex.id)} className="text-zinc-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div>
                                                            <label className="block text-zinc-500 mb-1">Sets</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-zinc-50 border rounded px-1 py-1"
                                                                value={ex.sets}
                                                                onChange={(e) => handleUpdateStats(ex.id!, { sets: Number(e.target.value) })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-zinc-500 mb-1">Reps</label>
                                                            <input
                                                                type="number" // Could be text for range "8-12"
                                                                className="w-full bg-zinc-50 border rounded px-1 py-1"
                                                                value={ex.reps || 0}
                                                                onChange={(e) => handleUpdateStats(ex.id!, { reps: Number(e.target.value) })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-zinc-500 mb-1">Min</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-zinc-50 border rounded px-1 py-1"
                                                                value={ex.duration_minutes || 0}
                                                                onChange={(e) => handleUpdateStats(ex.id!, { duration_minutes: Number(e.target.value) })}
                                                            />
                                                        </div>
                                                    </div>
                                                    {(ex.exercise?.met || 0) > 0 && (
                                                        <div className="mt-2 text-[10px] text-zinc-400 flex items-center gap-1">
                                                            <Zap className="h-3 w-3" /> MET: {ex.exercise?.met}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <button
                                        onClick={() => { setSelectedDay(dayNum); setShowPicker(true); }}
                                        className="m-4 py-2 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 font-bold hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Plus className="h-4 w-4" /> Agregar Ejercicio
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Exercise Picker Modal */}
            {showPicker && (
                <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-zinc-900">Agregar al Día {selectedDay}</h2>
                                <p className="text-zinc-500 text-sm">Mostrando ejercicios compatibles con tu equipo</p>
                            </div>
                            <button onClick={() => setShowPicker(false)} className="p-2 hover:bg-zinc-100 rounded-full">✕</button>
                        </div>

                        <div className="p-4 border-b border-zinc-100 bg-zinc-50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar ejercicio..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-500 outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredPickerExercises.map(ex => (
                                <button
                                    key={ex.id}
                                    onClick={() => handleAddExercise(ex)}
                                    className="w-full text-left p-4 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all group flex items-start justify-between"
                                >
                                    <div>
                                        <h4 className="font-bold text-zinc-900 group-hover:text-emerald-700">{ex.title}</h4>
                                        <div className="flex gap-2 text-xs mt-1 text-zinc-500">
                                            <span className="bg-zinc-100 px-2 py-0.5 rounded">{ex.body_part}</span>
                                            <span className="bg-zinc-100 px-2 py-0.5 rounded">{ex.type}</span>
                                            {ex.met && <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {ex.met}</span>}
                                        </div>
                                    </div>
                                    <Plus className="h-5 w-5 text-zinc-300 group-hover:text-emerald-500" />
                                </button>
                            ))}
                            {filteredPickerExercises.length === 0 && (
                                <div className="text-center py-10 text-zinc-400">
                                    No se encontraron ejercicios
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
