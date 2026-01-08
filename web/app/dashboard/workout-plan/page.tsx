"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Activity, Zap, Trash2, Edit } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getWorkoutPlans, createWorkoutPlan, deleteWorkoutPlan, updateWorkoutPlan } from "@/lib/supabase/exercises";
import type { WorkoutPlan } from "@/types";

export default function WorkoutPlansPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlanName, setNewPlanName] = useState("");
    const [newPlanDays, setNewPlanDays] = useState(3);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push("/login");
            return;
        }

        setUserId(user.id);
        try {
            const userPlans = await getWorkoutPlans(user.id);
            setPlans(userPlans);
        } catch (error) {
            console.error("Error loading plans:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!userId || !newPlanName) return;

        try {
            // Deactivate other plans if this is the first one
            const isFirst = plans.length === 0;

            const newPlan = await createWorkoutPlan(userId, {
                name: newPlanName,
                days_per_week: newPlanDays,
                total_met_hours: 0,
                estimated_calories_weekly: 0,
                is_active: isFirst, // Auto-activate if first
            });

            setPlans([newPlan, ...plans]);
            setShowCreateModal(false);
            setNewPlanName("");
            // Redirect to edit page immediately
            router.push(`/dashboard/workout-plan/${newPlan.id}`);
        } catch (error) {
            console.error("Error creating plan:", error);
            alert("Error al crear el plan");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Estás seguro de eliminar este plan?")) return;
        try {
            await deleteWorkoutPlan(id);
            setPlans(plans.filter(p => p.id !== id));
        } catch (error) {
            console.error("Error deleting plan:", error);
        }
    };

    const handleActivate = async (plan: WorkoutPlan) => {
        try {
            // Deactivate all others locally first for optimistic UI
            const updatedPlans = plans.map(p => ({
                ...p,
                is_active: p.id === plan.id
            }));
            setPlans(updatedPlans);

            // In a real app, you'd use a transaction or batch update
            // For now, we assume the user only has a few plans so this is fine
            // Note: Ideally backend should handle "set active" logic to ensure only one is active
            await updateWorkoutPlan(plan.id!, { is_active: true });

            // Deactivate others
            for (const p of plans) {
                if (p.id !== plan.id && p.is_active) {
                    await updateWorkoutPlan(p.id!, { is_active: false });
                }
            }
            router.refresh(); // Sync State Fix
        } catch (error) {
            console.error("Error activating plan:", error);
            loadPlans(); // Revert on error
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                            <Calendar className="h-7 w-7 text-purple-500" />
                            Mis Planes
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base">
                            Organiza tu semana de entrenamiento
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Nuevo Plan
                    </button>
                </div>

                {plans.length === 0 ? (
                    <div className="text-center py-12 md:py-16 bg-white dark:bg-gray-800/50 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm dark:shadow-none">
                        <Calendar className="h-16 w-16 text-purple-200 dark:text-purple-400/50 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No tienes planes creados</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm px-4">Crea tu primer plan para comenzar a organizar tus rutinas.</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="py-3 px-6 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-all shadow-lg hover:shadow-purple-500/25"
                        >
                            Crear Plan
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`group relative bg-white dark:bg-gray-900 backdrop-blur-xl border-2 rounded-3xl p-6 shadow-xl transition-all hover:scale-[1.02] ${plan.is_active ? "border-purple-500 ring-4 ring-purple-50" : "border-purple-100 dark:border-purple-900 hover:border-purple-300"
                                    }`}
                            >
                                {plan.is_active && (
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                                        ACTIVO
                                    </div>
                                )}

                                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 pr-16">{plan.name}</h3>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                        <Calendar className="h-5 w-5 text-purple-500" />
                                        <span className="font-medium">{plan.days_per_week} días / semana</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                        <Activity className="h-5 w-5 text-coral-500" />
                                        <span className="font-medium">~{plan.estimated_calories_weekly} kcal quemadas</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                        <Zap className="h-5 w-5 text-yellow-500" />
                                        <span className="font-medium">{plan.total_met_hours?.toFixed(1) || 0} Horas MET</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t-2 border-zinc-100">
                                    <button
                                        onClick={() => router.push(`/dashboard/workout-plan/${plan.id}`)}
                                        className="flex-1 py-2 rounded-lg bg-zinc-900 text-white font-bold hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Edit className="h-4 w-4" />
                                        Editar
                                    </button>

                                    {!plan.is_active && (
                                        <button
                                            onClick={() => handleActivate(plan)}
                                            className="px-3 py-2 rounded-lg border-2 border-purple-200 text-purple-600 font-bold hover:bg-purple-50 transition-all text-sm"
                                            title="Activar este plan"
                                        >
                                            Activar
                                        </button>
                                    )}

                                    <button
                                        onClick={() => plan.id && handleDelete(plan.id)}
                                        className="px-3 py-2 rounded-lg border-2 border-red-100 text-red-500 hover:bg-red-50 transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6">Nuevo Plan</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-zinc-700 mb-2">Nombre del Plan</label>
                                    <input
                                        type="text"
                                        value={newPlanName}
                                        onChange={(e) => setNewPlanName(e.target.value)}
                                        placeholder="Ej: Rutina de Volumen"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 font-medium focus:border-purple-500 outline-none"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-zinc-700 mb-2">Días por semana</label>
                                    <select
                                        value={newPlanDays}
                                        onChange={(e) => setNewPlanDays(Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 font-medium focus:border-purple-500 outline-none"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7].map(d => (
                                            <option key={d} value={d}>{d} días</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-3 rounded-xl border-2 border-zinc-200 font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newPlanName}
                                        className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 disabled:opacity-50"
                                    >
                                        Crear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
