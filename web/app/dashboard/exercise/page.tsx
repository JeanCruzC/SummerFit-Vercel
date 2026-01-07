"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Plus, Trash2, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { Card, Button, Input, Select, Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getProfile, getExerciseLogs, addExerciseLog, deleteExerciseLog } from "@/lib/supabase/database";
import { calculateCaloriesBurned } from "@/lib/calculations";
import { ExerciseLog, UserProfile } from "@/types";

const EXERCISE_TYPES = [
    { value: "Caminar", label: "🚶 Caminar" },
    { value: "Correr", label: "🏃 Correr" },
    { value: "Ciclismo", label: "🚴 Ciclismo" },
    { value: "Natación", label: "🏊 Natación" },
    { value: "Pesas", label: "🏋️ Pesas" },
    { value: "HIIT", label: "⚡ HIIT" },
    { value: "Yoga", label: "🧘 Yoga" },
    { value: "Cardio", label: "❤️ Cardio" },
];

export default function ExercisePage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string>("");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [exercises, setExercises] = useState<ExerciseLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [exerciseType, setExerciseType] = useState("Correr");
    const [duration, setDuration] = useState(30);
    const [intensity, setIntensity] = useState<"Baja" | "Media" | "Alta">("Media");

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }
            setUserId(session.user.id);

            const [prof, logs] = await Promise.all([
                getProfile(session.user.id),
                getExerciseLogs(session.user.id, date),
            ]);
            setProfile(prof);
            setExercises(logs);
            setLoading(false);
        };
        load();
    }, [router, date]);

    const handleAdd = async () => {
        if (!profile) return;
        setAdding(true);

        const caloriesBurned = calculateCaloriesBurned(profile.weight_kg, exerciseType, duration, intensity);

        const success = await addExerciseLog({
            user_id: userId,
            log_date: date,
            exercise_type: exerciseType,
            duration_minutes: duration,
            intensity,
            calories_burned: caloriesBurned,
        });

        if (success) {
            const logs = await getExerciseLogs(userId, date);
            setExercises(logs);
            setShowForm(false);
        }
        setAdding(false);
    };

    const handleDelete = async (id: number) => {
        await deleteExerciseLog(id);
        setExercises(e => e.filter(ex => ex.id !== id));
    };

    const totalCalories = exercises.reduce((a, e) => a + (e.calories_burned || 0), 0);
    const totalMinutes = exercises.reduce((a, e) => a + (e.duration_minutes || 0), 0);

    // Preview calories
    const previewCalories = profile ? calculateCaloriesBurned(profile.weight_kg, exerciseType, duration, intensity) : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Registro de Ejercicio</h1>
                    <p className="text-gray-500 mt-1">Registra tu actividad física diaria.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    />
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="h-4 w-4" /> Agregar
                    </Button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="text-center">
                    <Flame className="h-8 w-8 text-orange-500 mx-auto" />
                    <div className="text-3xl font-bold mt-2">{totalCalories}</div>
                    <div className="text-sm text-gray-500">Calorías quemadas</div>
                </Card>
                <Card className="text-center">
                    <Dumbbell className="h-8 w-8 text-purple-500 mx-auto" />
                    <div className="text-3xl font-bold mt-2">{totalMinutes}</div>
                    <div className="text-sm text-gray-500">Minutos de ejercicio</div>
                </Card>
            </div>

            {/* Exercise List */}
            <Card>
                <h2 className="text-lg font-semibold mb-4">Actividades del día</h2>

                {exercises.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No hay ejercicios registrados.</p>
                ) : (
                    <div className="space-y-3">
                        {exercises.map(ex => (
                            <div key={ex.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 grid place-items-center">
                                        <Dumbbell className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{ex.exercise_type}</div>
                                        <div className="text-sm text-gray-500">
                                            {ex.duration_minutes} min · {ex.intensity}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-lg font-semibold text-orange-500">{ex.calories_burned} kcal</div>
                                    </div>
                                    <button onClick={() => ex.id && handleDelete(ex.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Add Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <Card className="max-w-md w-full">
                        <h3 className="text-xl font-semibold mb-4">Agregar Ejercicio</h3>

                        <div className="space-y-4">
                            <Select
                                label="Tipo de ejercicio"
                                options={EXERCISE_TYPES}
                                value={exerciseType}
                                onChange={e => setExerciseType(e.target.value)}
                            />

                            <Input
                                label="Duración (minutos)"
                                type="number"
                                min={5}
                                max={300}
                                value={duration}
                                onChange={e => setDuration(parseInt(e.target.value) || 30)}
                            />

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Intensidad</label>
                                <div className="flex gap-2">
                                    {(["Baja", "Media", "Alta"] as const).map(i => (
                                        <button
                                            key={i}
                                            onClick={() => setIntensity(i)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${intensity === i ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600"}`}
                                        >
                                            {i}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-center">
                                <div className="text-sm text-orange-600 dark:text-orange-400">Calorías estimadas</div>
                                <div className="text-3xl font-bold text-orange-600">{previewCalories} kcal</div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>
                                Cancelar
                            </Button>
                            <Button className="flex-1" onClick={handleAdd} disabled={adding}>
                                {adding ? "Agregando..." : "Agregar"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </motion.div>
    );
}
