"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types";
import { Card, Button, Chip, Skeleton } from "@/components/ui";
import { MapPin, ArrowLeft, Trophy, Dumbbell, Calendar, Flame, TrendingUp, Utensils } from "lucide-react";
import CommunityFeed from "@/components/dashboard/CommunityFeed";
import FloatingChat from "@/components/dashboard/FloatingChat";
import { motion } from "framer-motion";

export default function FriendProfilePage() {
    const params = useParams();
    const router = useRouter();
    const targetUserId = params.id as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            // Fetch target profile
            if (targetUserId) {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("user_id", targetUserId)
                    .single();

                if (data && !error) {
                    setProfile(data as UserProfile);
                } else {
                    console.error("Profile not found or error:", error);
                }
            }
            setLoading(false);
        };

        fetchData();
    }, [targetUserId]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-64 w-full rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-40 rounded-2xl" />
                    <Skeleton className="h-40 rounded-2xl" />
                    <Skeleton className="h-40 rounded-2xl" />
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-800">Perfil no encontrado</h2>
                <Button onClick={() => router.back()} className="mt-4">Volver</Button>
            </div>
        )
    }

    // Determine privacy access (default public if not specified, for now)
    const canViewRoutine = profile.is_public_routine !== false;
    const canViewNutrition = profile.is_public_nutrition !== false;

    return (
        <div className="max-w-6xl mx-auto space-y-8 relative">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center text-gray-500 hover:text-purple-600 transition-colors gap-2"
            >
                <ArrowLeft className="h-4 w-4" /> Volver a la Comunidad
            </button>

            {/* Header Profile Card */}
            <Card className="overflow-hidden border-none shadow-lg dark:bg-gray-800">
                <div className="h-40 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600"></div>
                <div className="px-8 pb-8">
                    <div className="relative flex flex-col md:flex-row justify-between items-end -mt-16 md:-mt-12 mb-6 gap-4">
                        <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-white shadow-md flex-shrink-0">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400 text-4xl font-bold">
                                    {(profile.full_name || "U")[0]}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 md:pb-4">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                {profile.full_name || "Usuario de SummerFit"}
                            </h1>
                            <div className="flex flex-wrap gap-4 text-gray-500 mb-4 items-center">
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" /> {profile.city || profile.location_name || "Ubicación desconocida"}
                                </span>
                                {profile.gym_experience && (
                                    <span className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm font-medium">
                                        <Dumbbell className="h-3 w-3" /> {profile.gym_experience}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {profile.goal && (
                                    <Chip className="bg-pink-100 text-pink-700 border-pink-200">Meta: {profile.goal}</Chip>
                                )}
                                {profile.activity_level && (
                                    <Chip className="bg-blue-100 text-blue-700 border-blue-200">Nivel: {profile.activity_level}</Chip>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stats & Info */}
                <div className="space-y-6 lg:col-span-1">
                    {/* General Stats */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" /> Estadísticas
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl text-center">
                                <div className="text-xs text-gray-500 mb-1">Racha</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-1">
                                    0 <Flame className="h-4 w-4 text-orange-500" />
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl text-center">
                                <div className="text-xs text-gray-500 mb-1">Entrenos</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">
                                    0
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Nutrition Stats (If Public) */}
                    {canViewNutrition ? (
                        <Card className="p-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Utensils className="h-5 w-5 text-green-500" /> Nutrición <span className="text-xs font-normal text-gray-400 ml-auto bg-gray-100 px-2 py-1 rounded-full">Hoy</span>
                            </h3>
                            {/* Placeholder for real nutrition data */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-sm text-gray-500">Calorías</div>
                                    <div className="font-bold text-gray-900 dark:text-white">-- / -- kcal</div>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[0%]"></div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="bg-red-50 text-red-700 p-2 rounded-lg">
                                        <div className="font-bold">Prot</div>
                                        <div>--g</div>
                                    </div>
                                    <div className="bg-yellow-50 text-yellow-700 p-2 rounded-lg">
                                        <div className="font-bold">Carbs</div>
                                        <div>--g</div>
                                    </div>
                                    <div className="bg-blue-50 text-blue-700 p-2 rounded-lg">
                                        <div className="font-bold">Grasas</div>
                                        <div>--g</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-6 opacity-80 border-dashed">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <Utensils className="h-5 w-5 text-gray-400" /> Nutrición
                            </h3>
                            <p className="text-sm text-gray-500">Este usuario mantiene su nutrición privada.</p>
                        </Card>
                    )}

                    {/* Routine Stats (If Public) */}
                    {canViewRoutine ? (
                        <Card className="p-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Dumbbell className="h-5 w-5 text-blue-500" /> Rutina Actual
                            </h3>
                            <div className="text-center py-6 bg-blue-50/50 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                <p className="text-blue-600 font-medium">Sin rutina activa</p>
                                <p className="text-xs text-blue-400 mt-1">Este usuario no ha seleccionado un plan público.</p>
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-6 opacity-80 border-dashed">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <Dumbbell className="h-5 w-5 text-gray-400" /> Rutina
                            </h3>
                            <p className="text-sm text-gray-500">Este usuario mantiene su rutina privada.</p>
                        </Card>
                    )}
                </div>

                {/* Right Column: Feed & Activity */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Progress Graph (Placeholder) */}
                    <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white border-none">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-400" /> Progreso Reciente
                        </h3>
                        <div className="h-40 flex items-end justify-between px-2 gap-2">
                            {/* Fake Bars for UI Mockup */}
                            {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                                <div key={i} className="w-full bg-white/10 rounded-t-lg hover:bg-white/20 transition-colors relative group">
                                    <div className="absolute bottom-0 w-full bg-emerald-500/80 rounded-t-lg transition-all duration-500" style={{ height: `${h}%` }}></div>
                                    {/* Tooltip */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        Día {i + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-3 text-xs text-gray-400 font-medium px-1">
                            <span>Lun</span>
                            <span>Mar</span>
                            <span>Mié</span>
                            <span>Jue</span>
                            <span>Vie</span>
                            <span>Sáb</span>
                            <span>Dom</span>
                        </div>
                    </Card>

                    <h3 className="font-bold text-xl text-gray-800 dark:text-white pt-2">Actividad Reciente</h3>
                    {currentUserId && (
                        <CommunityFeed currentUserId={currentUserId} targetUserId={targetUserId} showCreatePost={false} />
                    )}
                </div>
            </div>

            {/* Floating Chat Bubble */}
            {currentUserId && profile && (
                <FloatingChat
                    currentUserId={currentUserId}
                    targetUserId={targetUserId}
                    targetUserName={profile.full_name || "Amigo"}
                    targetUserAvatar={profile.avatar_url}
                />
            )}
        </div>
    );
}
