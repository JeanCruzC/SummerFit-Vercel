"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types";
import { Card, Button, Input, Chip, Skeleton } from "@/components/ui";
import { MapPin, ArrowLeft, Trophy, Dumbbell, Calendar, MessageCircle } from "lucide-react";
import CommunityFeed from "@/components/dashboard/CommunityFeed";
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

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center text-gray-500 hover:text-purple-600 transition-colors gap-2"
            >
                <ArrowLeft className="h-4 w-4" /> Volver a la Comunidad
            </button>

            {/* Header Profile Card */}
            <Card className="overflow-hidden border-none shadow-lg dark:bg-gray-800">
                <div className="h-32 bg-gradient-to-r from-purple-600 to-pink-500"></div>
                <div className="px-8 pb-8">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <div className="h-32 w-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-white shadow-md">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400 text-4xl font-bold">
                                    {(profile.full_name || "U")[0]}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mb-2">
                            {/* Actions if needed */}
                        </div>
                    </div>

                    <div>
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
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" /> Estadísticas
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-500">Racha Actual</span>
                                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                    🔥 0 días
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-500">Entrenamientos</span>
                                <span className="font-bold text-gray-900 dark:text-white">0</span>
                            </div>
                            {/* Can fetch real stats later */}
                        </div>
                    </Card>

                    <Card className="p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-none">
                        <h3 className="font-bold text-lg mb-2">¡Motiva a {profile.full_name?.split(' ')[0]}!</h3>
                        <p className="text-purple-100 text-sm mb-4">Envíale un mensaje de apoyo para que siga cumpliendo sus metas.</p>
                        <Button className="w-full bg-white text-purple-600 hover:bg-gray-100 border-none">
                            <MessageCircle className="h-4 w-4 mr-2" /> Enviar Mensaje
                        </Button>
                    </Card>
                </div>

                {/* Feed */}
                <div className="lg:col-span-2">
                    <h3 className="font-bold text-xl mb-4 text-gray-800 dark:text-white">Actividad Reciente</h3>
                    {currentUserId && (
                        <CommunityFeed currentUserId={currentUserId} targetUserId={targetUserId} />
                    )}
                </div>
            </div>
        </div>
    );
}

