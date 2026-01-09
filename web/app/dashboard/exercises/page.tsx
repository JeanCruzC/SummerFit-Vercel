"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Star, Dumbbell, Zap, Heart, PlayCircle, BookOpen, X } from "lucide-react";
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
    const [filterForce, setFilterForce] = useState("");
    const [filterMechanic, setFilterMechanic] = useState("");
    const [locationType, setLocationType] = useState<"all" | "home" | "gym">("all");

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, filterBodyPart, filterLevel, filterType, locationType, filterForce, filterMechanic, exercises]);

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
                setLocationType("home");
            }

            const exercisesList = await getExercisesByEquipment(equipment);
            setExercises(exercisesList);

            // Sort by popularity/rank
            exercisesList.sort((a, b) => (b.ranking_score || 0) - (a.ranking_score || 0));

            setFilteredExercises(exercisesList);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = exercises;

        if (locationType === "home") {
            filtered = filtered.filter(ex => {
                const eq = ex.equipment_required || [];
                return eq.length === 0 || eq.includes("Peso corporal") || eq.includes("None") || eq.includes("Ninguno");
            });
        } else if (locationType === "gym") {
            filtered = filtered.filter(ex => {
                const eq = ex.equipment_required || [];
                return eq.length > 0 && !eq.includes("Peso corporal");
            });
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const synonyms: Record<string, string[]> = {
                "push up": ["flexiones", "push-up", "pecho"],
                "pull up": ["dominadas", "pull-up", "espalda"],
                "run": ["correr", "trote", "cardio"],
                "squat": ["sentadilla", "pierna"],
                "lunge": ["zancada", "estocada"],
                "bench press": ["press de banca", "pecho"],
                "abs": ["abdomen", "plancha", "crunch"],
                "calisthenics": ["peso corporal", "calistenia"]
            };

            let searchTerms = [query];
            Object.keys(synonyms).forEach(key => {
                if (query.includes(key)) {
                    searchTerms = [...searchTerms, ...synonyms[key]];
                }
            });

            filtered = filtered.filter(ex =>
                searchTerms.some(term =>
                    ex.title.toLowerCase().includes(term) ||
                    (ex.title_en && ex.title_en.toLowerCase().includes(term)) ||
                    ex.description?.toLowerCase().includes(term) ||
                    ex.body_part?.toLowerCase().includes(term) ||
                    ex.slug.includes(term)
                )
            );
        }

        if (filterBodyPart) {
            filtered = filtered.filter(ex => ex.body_part === filterBodyPart);
        }

        if (filterLevel) {
            filtered = filtered.filter(ex => ex.level === filterLevel);
        }

        // Fix: "Type" in DB is now 'Fuerza' mostly, but we can filter by Force/Mechanic too
        if (filterType) {
            filtered = filtered.filter(ex => ex.type === filterType);
        }

        if (filterForce) {
            filtered = filtered.filter(ex => ex.force === filterForce);
        }

        if (filterMechanic) {
            filtered = filtered.filter(ex => ex.mechanic === filterMechanic);
        }

        setFilteredExercises(filtered);
    };

    const bodyParts = Array.from(new Set(exercises.map(e => e.body_part).filter(Boolean))) as string[];
    const levels = Array.from(new Set(exercises.map(e => e.level).filter(Boolean))) as string[];
    // Provide hardcoded options for cleaner UI
    const forces = ["Push", "Pull", "Static"];
    const mechanics = ["Compound", "Isolation"];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-3">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
                            Biblioteca de Ejercicios
                        </span>
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 text-lg">
                        Explora {filteredExercises.length} ejercicios optimizados para tu equipamiento.
                    </p>
                </div>

                {/* Search & Filters Panel */}
                <div className="bg-white dark:bg-gray-900 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                    {/* Search */}
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre, músculo o tipo..."
                            className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-zinc-900 dark:text-white placeholder-zinc-400 font-medium focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all"
                        />
                    </div>

                    {/* Filter Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {/* Location Toggle - Full Width on Mobile */}
                        <div className="col-span-2 md:col-span-4 lg:col-span-1 flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                            <button
                                onClick={() => setLocationType("all")}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all ${locationType === "all" ? "bg-white dark:bg-gray-700 shadow text-purple-600" : "text-gray-500"}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setLocationType("home")}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all ${locationType === "home" ? "bg-white dark:bg-gray-700 shadow text-green-600" : "text-gray-500"}`}
                            >
                                Casa
                            </button>
                            <button
                                onClick={() => setLocationType("gym")}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all ${locationType === "gym" ? "bg-white dark:bg-gray-700 shadow text-blue-600" : "text-gray-500"}`}
                            >
                                Gym
                            </button>
                        </div>

                        <FilterSelect label="Músculo" value={filterBodyPart} onChange={setFilterBodyPart} options={bodyParts} />
                        <FilterSelect label="Nivel" value={filterLevel} onChange={setFilterLevel} options={levels} />
                        <FilterSelect label="Fuerza" value={filterForce} onChange={setFilterForce} options={forces} />
                        <FilterSelect label="Mecánica" value={filterMechanic} onChange={setFilterMechanic} options={mechanics} />
                    </div>
                </div>

                {/* Results Grid */}
                {filteredExercises.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="bg-purple-100 dark:bg-purple-900/20 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Dumbbell className="h-10 w-10 text-purple-500" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No se encontraron resultados</h3>
                        <p className="text-zinc-500">Intenta ajustar tus filtros de búsqueda.</p>
                        <button
                            onClick={() => { setSearchQuery(""); setLocationType("all"); setFilterBodyPart(""); setFilterLevel(""); setFilterForce(""); setFilterMechanic(""); }}
                            className="mt-6 px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold hover:scale-105 transition"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredExercises.map((exercise) => (
                            <ExerciseCard key={exercise.id} exercise={exercise} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper Component for Select Filters
function FilterSelect({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: string[] }) {
    return (
        <div className="relative">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block pl-1">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-zinc-900 dark:text-white focus:border-purple-500 outline-none appearance-none cursor-pointer"
            >
                <option value="">Cualquiera</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            <div className="absolute right-3 bottom-3 pointer-events-none text-zinc-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
        </div>
    )
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
    const [isHovered, setIsHovered] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // Prefer video -> gif -> image
    // Prefer "male" & "front" angle if available, or just first video
    const media = exercise.exercise_media || [];
    const video = media.find(m => m.type === 'video' && m.angle === 'front') || media.find(m => m.type === 'video');
    const image = media.find(m => m.type === 'image' && m.angle === 'front') || media.find(m => m.type === 'image');

    // Fallback URL
    const displayUrl = video ? video.url : image ? image.url : null;
    const isVideo = !!video;

    return (
        <div
            className="group relative bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 border border-gray-100 dark:border-gray-800 flex flex-col h-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Media Area */}
            <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {displayUrl ? (
                    isVideo ? (
                        <video
                            src={displayUrl}
                            muted
                            loop
                            playsInline
                            // Auto-play on hover
                            ref={el => {
                                if (el) {
                                    if (isHovered) el.play().catch(() => { });
                                    else el.pause();
                                }
                            }}
                            className="w-full h-full object-cover"
                            poster={image?.url} // Use image as poster if available
                        />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={displayUrl} alt={exercise.title} className="w-full h-full object-cover" />
                    )
                ) : (
                    <div className="flex items-center justify-center h-full text-zinc-300">
                        <Dumbbell className="h-12 w-12" />
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {exercise.level === 'Principiante' && <span className="px-2 py-1 bg-green-500/90 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider rounded-md">Principiante</span>}
                    {exercise.level === 'Intermedio' && <span className="px-2 py-1 bg-yellow-500/90 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider rounded-md">Intermedio</span>}
                    {exercise.level === 'Avanzado' && <span className="px-2 py-1 bg-red-500/90 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider rounded-md">Avanzado</span>}
                </div>
            </div>

            {/* Content info */}
            <div className="p-5 flex flex-col flex-1">
                <div className="mb-3">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight mb-1 group-hover:text-purple-600 transition-colors">
                        {exercise.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">{exercise.body_part}</span>
                        <span>•</span>
                        <span>{exercise.mechanic || "Ejercicio"} {exercise.force ? `(${exercise.force})` : ""}</span>
                    </div>
                </div>

                {/* Equipment chips */}
                <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
                    {exercise.equipment_required && exercise.equipment_required.slice(0, 3).map((eq, i) => (
                        <span key={i} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold rounded-md border border-zinc-200 dark:border-zinc-700">
                            {eq}
                        </span>
                    ))}
                    {(exercise.equipment_required?.length || 0) > 3 && (
                        <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[10px] font-semibold rounded-md">+{(exercise.equipment_required?.length || 0) - 3}</span>
                    )}
                </div>

                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-gray-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                    {showDetails ? "Ocultar Detalles" : "Ver Instrucciones"}
                </button>
            </div>

            {/* Expanded Details Overlay/Panel */}
            {showDetails && (
                <div className="absolute inset-0 bg-white dark:bg-gray-900 z-10 p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-zinc-900 dark:text-white">Instrucciones</h4>
                        <button onClick={() => setShowDetails(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                            <X className="h-5 w-5 text-zinc-500" />
                        </button>
                    </div>

                    {exercise.instructions && exercise.instructions.length > 0 ? (
                        <ol className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300 list-decimal list-outside pl-4">
                            {exercise.instructions.map((step, idx) => (
                                <li key={idx} className="marker:text-purple-500 marker:font-bold">
                                    {step}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-zinc-500 italic">No hay instrucciones detalladas.</p>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="block text-zinc-400 font-semibold mb-1">Músculos Primarios</span>
                                <div className="flex flex-wrap gap-1">
                                    {exercise.primary_muscles?.map(m => (
                                        <span key={m} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100">{m}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="block text-zinc-400 font-semibold mb-1">Músculos Secundarios</span>
                                <div className="text-zinc-600">
                                    {exercise.secondary_muscles?.join(", ") || "N/A"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
