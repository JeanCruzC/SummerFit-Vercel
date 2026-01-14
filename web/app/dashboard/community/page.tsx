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

import CommunityFeed from "@/components/dashboard/CommunityFeed";

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
            setMyFriendships(prev => prev.map(f => f.id === tempId ? data as Friendship : f));
        }
    };

    const handleAcceptFriend = async (requestorId: string) => {
        if (!currentUserId) return;
        const supabase = createClient();

        // Optimistic Update
        setMyFriendships(prev => prev.map(f =>
            (f.user_id === requestorId && f.friend_id === currentUserId)
                ? { ...f, status: 'accepted' }
                : f
        ));

        // Call the secure RPC function we created in SQL
        const { error } = await supabase.rpc('accept_friend_request', { requestor_id: requestorId });

        if (error) {
            console.error("Error accepting friend:", error);
            // Revert logic would go here
            alert("Error al aceptar solicitud");
        }
    };

    // Use users directly as they are now server-filtered
    const displayUsers = users;

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
                <CommunityMap users={displayUsers} currentLocation={currentUserPos} />
            ) : viewMode === "feed" ? (
                <CommunityFeed currentUserId={currentUserId!} />
            ) : (
                <div className="space-y-6">
                    {/* Pending Requests Section */}
                    {myFriendships.some(f => f.status === 'pending' && f.friend_id === currentUserId) && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-900/50">
                            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                                <UserPlus className="h-4 w-4" /> Solicitudes Pendientes
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {myFriendships
                                    .filter(f => f.status === 'pending' && f.friend_id === currentUserId)
                                    .map(request => {
                                        // Need to find the profile of the requestor
                                        // Since we don't have it in 'users' list maybe (if filtered), usually we'd need to fetch them
                                        // For MVP let's see if they are in 'users' array, otherwise show generic info or id
                                        // NOTE: Ideally we should fetch these profiles specifically.
                                        // For now, let's assume we can fetch them or they are in 'users' if public. 
                                        // If not public, we might see "Usuario desconocido" for now which is a bug to fix later.
                                        const requestor = users.find(u => u.user_id === request.user_id);
                                        return (
                                            <Card key={request.id} className="p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-700 font-bold">
                                                        {(requestor?.full_name || "U")[0]}
                                                    </div>
                                                    <span className="font-medium text-sm">{requestor?.full_name || "Usuario"}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="xs" onClick={() => handleAcceptFriend(request.user_id)} className="bg-green-500 hover:bg-green-600 text-white">
                                                        Aceptar
                                                    </Button>
                                                </div>
                                            </Card>
                                        )
                                    })
                                }
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayUsers.length === 0 ? (
                            <div className="col-span-full text-center py-20">
                                {filter ? (
                                    <>
                                        <div className="text-gray-400 mb-2 text-4xl">🔍</div>
                                        <p className="text-gray-500">No se encontraron usuarios que coincidan con "{filter}".</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-gray-300 mb-4 text-6xl">👥</div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Aún no hay otros miembros</h3>
                                        <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                                            Parece que eres el primero aquí o no se han cargado los usuarios. ¡Invita a tus amigos a unirse!
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            displayUsers.map(user => {
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
                                                {user.avatar_url ? (
                                                    <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm relative">
                                                        <img
                                                            src={user.avatar_url}
                                                            alt={user.full_name || "Usuario"}
                                                            className="object-cover h-full w-full"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                                        {user.gender === 'M' ? '👨' : '👩'}
                                                    </div>
                                                )}
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
