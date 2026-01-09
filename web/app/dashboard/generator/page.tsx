'use client';

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { RoutineGenerator, type GeneratedRoutine, type RoutineGoal, type RoutineLevel } from "@/lib/generation/routine_generator";
import type { UserEquipment } from "@/types";
import { useRouter } from "next/navigation";

export default function GeneratorPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [equipment, setEquipment] = useState<UserEquipment[]>([]);

    // Form State
    const [goal, setGoal] = useState<RoutineGoal>('hypertrophy');
    const [level, setLevel] = useState<RoutineLevel>('beginner');
    const [routine, setRoutine] = useState<GeneratedRoutine | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const supabase = createClient();

            // Get user equipment
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: eqData } = await supabase
                .from('user_equipment')
                .select('*')
                .eq('user_id', user.id);

            setEquipment(eqData || []);
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

            // Artificial delay for "processing" feel
            await new Promise(r => setTimeout(r, 1500));

            const result = await generator.generate({
                goal,
                level,
                split: 'push_pull_legs',
                equipment
            });

            setRoutine(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error al generar rutina.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                        <span className="text-4xl">🧬</span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                            Generador Inteligente
                        </span>
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Diseña una rutina basada en ciencia (EMG + Biomecánica) adaptada a tu equipo.
                    </p>
                </header>

                {/* Configuration Panel */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Objetivo Principal</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setGoal('hypertrophy')}
                                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${goal === 'hypertrophy' ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' : 'border-gray-200 text-gray-500 hover:border-purple-200'}`}
                                >
                                    💪 Hipertrofia
                                </button>
                                <button
                                    onClick={() => setGoal('strength')}
                                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${goal === 'strength' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'border-gray-200 text-gray-500 hover:border-blue-200'}`}
                                >
                                    🏋️ Fuerza
                                </button>
                                <button
                                    onClick={() => setGoal('endurance')}
                                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${goal === 'endurance' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'border-gray-200 text-gray-500 hover:border-green-200'}`}
                                >
                                    🏃 Resistencia
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Nivel de Experiencia</label>
                            <select
                                value={level}
                                onChange={(e) => setLevel(e.target.value as RoutineLevel)}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none font-medium focus:ring-2 focus:ring-purple-500 text-zinc-900 dark:text-white"
                            >
                                <option value="beginner">Principiante (Prioridad Técnica)</option>
                                <option value="intermediate">Intermedio</option>
                                <option value="advanced">Avanzado (Prioridad Volumen)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
                        <div className="text-sm text-zinc-500">
                            Equipamiento detectado: <span className="font-bold text-zinc-800 dark:text-white">{loading ? "..." : equipment.length} ítems</span>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={generating || loading}
                            className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <span className="animate-spin">⚙️</span> Procesando Biomecánica...
                                </>
                            ) : (
                                <>
                                    ✨ Generar Rutina
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
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-black mb-2">{routine.name}</h2>
                                <p className="text-blue-100 max-w-xl text-lg opacity-90">{routine.description}</p>
                            </div>
                            {/* Abstract decoration */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {routine.days.map((day, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden hover:border-purple-200 transition-colors shadow-lg shadow-gray-200/50 dark:shadow-none">
                                    <div className="p-5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                        <div className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-1">Día {idx + 1}</div>
                                        <h3 className="text-xl font-black text-zinc-900 dark:text-white">{day.dayName}</h3>
                                        <div className="text-xs text-zinc-500 mt-1">{day.focus}</div>
                                    </div>

                                    <div className="p-2 flex-1 overflow-y-auto max-h-[600px]">
                                        {day.exercises.map((exItem, i) => (
                                            <div key={i} className="p-3 mb-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                                <div className="flex gap-3">
                                                    <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0 relative">
                                                        {exItem.exercise.exercise_media?.[0]?.url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={exItem.exercise.exercise_media[0].url}
                                                                className="w-full h-full object-cover"
                                                                alt={exItem.exercise.title}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">img</div>
                                                        )}
                                                        <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 font-bold">
                                                            {i + 1}
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-zinc-900 dark:text-white text-sm truncate leading-tight">
                                                            {exItem.exercise.title}
                                                        </h4>
                                                        <p className="text-[10px] text-zinc-500 mt-0.5 truncate uppercase">
                                                            {exItem.exercise.movement_pattern?.replace(/_/g, ' ') || 'General'}
                                                        </p>

                                                        {/* Workout Meta */}
                                                        <div className="flex items-center gap-3 mt-2 text-xs font-medium text-purple-700 dark:text-purple-400">
                                                            <span className="bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800">
                                                                {exItem.sets} x {exItem.reps}
                                                            </span>
                                                            <span className="text-zinc-400">Rest: {exItem.rest}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Scientific Justification Tooltip */}
                                                <div className="mt-1 ml-[76px] text-[10px] text-zinc-400 italic">
                                                    ✨ {exItem.reason}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
