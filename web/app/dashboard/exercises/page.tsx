"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Star, Dumbbell, Zap, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getUserEquipment, getExercisesByEquipment, searchExercises } from "@/lib/supabase/exercises";
import type { Exercise, UserEquipment } from "@/types";

export default function ExercisesPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [userEquipment, setUserEquipment] = useState<UserEquipment[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterBodyPart, setFilterBodyPart] = useState("");
    const [filterLevel, setFilterLevel] = useState("");
    const [filterType, setFilterType] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, filterBodyPart, filterLevel, filterType, exercises]);

    const loadData = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push("/login");
            return;
        }

        setUserId(user.id);

        try {
            const equipment = await getUserEquipment(user.id);
            setUserEquipment(equipment);

            if (equipment.length === 0) {
                // No equipment configured, redirect
                router.push("/dashboard/equipment");
                return;
            }

            const exercisesList = await getExercisesByEquipment(equipment);
            setExercises(exercisesList);
            setFilteredExercises(exercisesList);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = exercises;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(ex =>
                ex.title.toLowerCase().includes(query) ||
                ex.description?.toLowerCase().includes(query)
            );
        }

        if (filterBodyPart) {
            filtered = filtered.filter(ex => ex.body_part === filterBodyPart);
        }

        if (filterLevel) {
            filtered = filtered.filter(ex => ex.level === filterLevel);
        }

        if (filterType) {
            filtered = filtered.filter(ex => ex.type === filterType);
        }

        setFilteredExercises(filtered);
    };

    // Extract unique values for filters
    const bodyParts = Array.from(new Set(exercises.map(e => e.body_part).filter(Boolean)));
    const levels = Array.from(new Set(exercises.map(e => e.level).filter(Boolean)));
    const types = Array.from(new Set(exercises.map(e => e.type).filter(Boolean)));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-zinc-900 mb-2">💪 Ejercicios Disponibles</h1>
                    <p className="text-zinc-600 text-lg">
                        {filteredExercises.length} ejercicios que puedes hacer con tu equipamiento
                    </p>
                </div>

                {/* Search & Filters */}
                <div className="bg-white/95 backdrop-blur-xl border-2 border-emerald-100 rounded-3xl p-6 shadow-2xl mb-8">
                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar ejercicios..."
                                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-zinc-200 font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-bold text-zinc-700 mb-2 block">
                                Parte del cuerpo
                            </label>
                            <select
                                value={filterBodyPart}
                                onChange={(e) => setFilterBodyPart(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
                            >
                                <option value="">Todos</option>
                                {bodyParts.map(bp => (
                                    <option key={bp} val ue={bp}>{bp}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-zinc-700 mb-2 block">
                                Nivel
                            </label>
                            <select
                                value={filterLevel}
                                onChange={(e) => setFilterLevel(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
                            >
                                <option value="">Todos</option>
                                {levels.map(level => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-zinc-700 mb-2 block">
                                Tipo
                            </label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
                            >
                                <option value="">Todos</option>
                                {types.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Exercise Grid */}
                {filteredExercises.length === 0 ? (
                    <div className="text-center py-12 bg-white/95 backdrop-blur-xl border-2 border-emerald-100 rounded-3xl p-8">
                        <Dumbbell className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
                        <p className="text-zinc-500 font-medium">
                            No se encontraron ejercicios con estos filtros.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredExercises.map((exercise) => (
                            <ExerciseCard key={exercise.id} exercise={exercise} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
    const levelColors = {
        'Principiante': 'bg-green-100 text-green-700 border-green-200',
        'Intermedio': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'Avanzado': 'bg-red-100 text-red-700 border-red-200',
    };

    const typeIcons = {
        'Fuerza': '💪',
        'Cardio': '🏃',
        'Flexibilidad': '🧘',
    };

    return (
        <div className="bg-white/95 backdrop-blur-xl border-2 border-emerald-100 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-zinc-900 mb-2 line-clamp-2">
                        {exercise.title}
                    </h3>

                    <div className="flex gap-2 flex-wrap">
                        {exercise.level && (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${levelColors[exercise.level as keyof typeof levelColors] || 'bg-zinc-100 text-zinc-700'
                                }`}>
                                {exercise.level}
                            </span>
                        )}

                        {exercise.type && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border-2 border-emerald-200">
                                {typeIcons[exercise.type as keyof typeof typeIcons] || ''} {exercise.type}
                            </span>
                        )}
                    </div>
                </div>

                {exercise.rating && (
                    <div className="flex items-center gap-1 ml-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-sm">{exercise.rating.toFixed(1)}</span>
                    </div>
                )}
            </div>

            {/* Description */}
            {exercise.description && (
                <p className="text-sm text-zinc-600 mb-4 line-clamp-3">
                    {exercise.description}
                </p>
            )}

            {/* Metadata */}
            <div className="space-y-2 mb-4">
                {exercise.body_part && (
                    <div className="text-sm">
                        <span className="font-bold text-zinc-700">Parte del cuerpo:</span>{" "}
                        <span className="text-zinc-600">{exercise.body_part}</span>
                    </div>
                )}

                {exercise.met && (
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-bold text-emerald-700">
                            {exercise.met} MET
                        </span>
                        <span className="text-xs text-zinc-500">
                            (Intensidad metabólica)
                        </span>
                    </div>
                )}
            </div>

            {/* Equipment Required */}
            {exercise.equipment_required && exercise.equipment_required.length > 0 && (
                <div className="border-t-2 border-zinc-100 pt-4">
                    <div className="text-xs font-bold text-zinc-700 mb-2">Equipamiento:</div>
                    <div className="flex flex-wrap gap-2">
                        {exercise.equipment_required.map((eq, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-medium"
                            >
                                {eq}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Button */}
            <button
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
                <Heart className="h-4 w-4" />
                Agregar a mi plan
            </button>
        </div>
    );
}
