"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, UserPlus, Users, Filter, Map as MapIcon, List, Check } from "lucide-react";
import { Card, Input, Button, Chip, Skeleton, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types";
import dynamic from 'next/dynamic';

const CommunityMap = dynamic(() => import('@/components/ui/CommunityMap'), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center text-gray-400">Cargando mapa...</div>
});

import { Friendship } from "@/types";

export default function CommunityPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [myFriendships, setMyFriendships] = useState<Friendship[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"list" | "map" | "feed">("list");
    const [filter, setFilter] = useState("");
    const [currentUserPos, setCurrentUserPos] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                // Get location
                const { data: profile } = await supabase.from("profiles").select("latitude, longitude").eq("user_id", user.id).single();
                if (profile?.latitude && profile?.longitude) {
                    setCurrentUserPos({ lat: profile.latitude, lng: profile.longitude });
                }

                // Get My Friendships
                const { data: friendships } = await supabase
                    .from("friendships")
                    .select("*")
                    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

                if (friendships) setMyFriendships(friendships as Friendship[]);
            }

            // Fetch public profiles
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("is_public_profile", true)
                .neq("user_id", user?.id) // Exclude self
                .limit(50);

            if (!error && data) {
                setUsers(data as UserProfile[]);
            }
            setLoading(false);
        };

        fetchData();
    }, []);

    const getFriendshipStatus = (otherUserId: string) => {
        const friendship = myFriendships.find(f =>
            (f.user_id === currentUserId && f.friend_id === otherUserId) ||
            (f.friend_id === currentUserId && f.user_id === otherUserId)
        );

        if (!friendship) return null;

        return {
            status: friendship.status,
            isSender: friendship.user_id === currentUserId
        };
    };

    const handleConnect = async (otherUserId: string) => {
        if (!currentUserId) return;
        const supabase = createClient();

        // Optimistic update
        const tempId = Math.random().toString();
        const newFriendship: Friendship = {
            id: tempId,
            user_id: currentUserId,
            friend_id: otherUserId,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        setMyFriendships([...myFriendships, newFriendship]);

        const { data, error } = await supabase.from("friendships").insert({
            user_id: currentUserId,
            friend_id: otherUserId,
            status: 'pending'
        }).select().single();

        if (error) {
            console.error("Error sending request:", error);
            // Revert on error
            setMyFriendships(prev => prev.filter(f => f.id !== tempId));
            alert("Error al enviar solicitud.");
        } else if (data) {
            // Update with real ID
            setMyFriendships(prev => prev.map(f => f.id === tempId ? data : f));
        }
    };

    const filteredUsers = users.filter(u =>
        (u.location_name?.toLowerCase().includes(filter.toLowerCase())) ||
        (u.goal?.toLowerCase().includes(filter.toLowerCase())) ||
        (u.full_name?.toLowerCase().includes(filter.toLowerCase())) ||
        (u.activity_level?.toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Users className="h-8 w-8 text-purple-600" /> Comunidad
                    </h1>
                    <p className="text-gray-500">Encuentra amigos con objetivos similares cerca de ti.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={viewMode === "list" ? "primary" : "secondary"}
                        onClick={() => setViewMode("list")}
                        size="sm"
                    >
                        <List className="h-4 w-4 mr-2" /> Lista
                    </Button>
                    <Button
                        variant={viewMode === "map" ? "primary" : "secondary"}
                        onClick={() => setViewMode("map")}
                        size="sm"
                    >
                        <MapIcon className="h-4 w-4 mr-2" /> Mapa
                    </Button>
                    <Button
                        variant={viewMode === "feed" ? "primary" : "secondary"}
                        onClick={() => setViewMode("feed")}
                        size="sm"
                    >
                        <Users className="h-4 w-4 mr-2" /> Feed
                    </Button>
                </div>
            </div>

            {/* Filters */}
            {viewMode !== "feed" && (
                <Card className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, ciudad, objetivo..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none transition"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>
                </Card>
            )}

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
                </div>
            ) : viewMode === "map" ? (
                <CommunityMap users={filteredUsers} currentLocation={currentUserPos} />
            ) : viewMode === "feed" ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Feed de Actividad</h3>
                    <p className="text-gray-500 max-w-md mx-auto mt-2">
                        Próximamente podrás ver aquí cuando tus amigos completen sus rutinas o alcancen nuevos récords. 🚀
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.length === 0 ? (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            No se encontraron usuarios con esos criterios.
                        </div>
                    ) : (
                        filteredUsers.map(user => {
                            const friendship = getFriendshipStatus(user.user_id);
                            return (
                                <motion.div
                                    key={user.user_id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl">
                                                {user.gender === 'M' ? '👨' : '👩'}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-lg">
                                                    {user.full_name || "Usuario SummerFit"}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {user.location_name || "Ubicación desconocida"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex flex-wrap gap-2">
                                            <Chip color="purple">{user.goal}</Chip>
                                            <Chip color="gray">{user.activity_level}</Chip>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                                            <div className="text-center">
                                                <div className="font-bold">{user.age}</div>
                                                <div className="text-[10px] uppercase text-gray-400">Edad</div>
                                            </div>
                                            <div className="text-center border-l border-gray-200 dark:border-gray-600 pl-4">
                                                <div className="font-bold">{user.diet_type}</div>
                                                <div className="text-[10px] uppercase text-gray-400">Dieta</div>
                                            </div>
                                        </div>
                                    </div>

                                    {friendship?.status === 'accepted' ? (
                                        <Button className="w-full bg-green-500 hover:bg-green-600 text-white" disabled>
                                            <Check className="h-4 w-4 mr-2" /> Amigos
                                        </Button>
                                    ) : friendship?.status === 'pending' ? (
                                        <Button className="w-full bg-amber-500/10 text-amber-600 border border-amber-200" disabled variant="secondary">
                                            {friendship.isSender ? "Solicitud Enviada" : "Solicitud Pendiente"}
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full"
                                            variant="secondary"
                                            onClick={() => handleConnect(user.user_id)}
                                        >
                                            <UserPlus className="h-4 w-4 mr-2" /> Conectar
                                        </Button>
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
