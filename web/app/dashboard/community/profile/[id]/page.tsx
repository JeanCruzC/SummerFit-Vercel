"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types";
import { Card, Button, Input, Chip, Skeleton } from "@/components/ui";
import { MapPin, ArrowLeft, Trophy, Dumbbell, Calendar, MessageCircle, Send } from "lucide-react";
import CommunityFeed from "@/components/dashboard/CommunityFeed";
import { motion } from "framer-motion";

export default function FriendProfilePage() {
    const params = useParams();
    const router = useRouter();
    const targetUserId = params.id as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Messaging Logic
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);

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

    // Chat Subscription & Fetch
    useEffect(() => {
        if (!currentUserId || !targetUserId) return;

        // 1. Fetch initial messages
        const fetchMessages = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("private_messages")
                .select("*")
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`)
                .order("created_at", { ascending: true });

            if (data) setMessages(data);
        };

        fetchMessages();

        // 2. Realtime Subscription
        const supabase = createClient();
        const channel = supabase
            .channel(`chat:${currentUserId}-${targetUserId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'private_messages',
                    filter: `receiver_id=in.(${currentUserId},${targetUserId})`
                },
                (payload) => {
                    // Only add if it belongs to this conversation
                    const msg = payload.new as any;
                    if (
                        (msg.sender_id === currentUserId && msg.receiver_id === targetUserId) ||
                        (msg.sender_id === targetUserId && msg.receiver_id === currentUserId)
                    ) {
                        setMessages(prev => [...prev, msg]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, targetUserId]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUserId || !targetUserId) return;
        setSending(true);

        const supabase = createClient();
        const msgContent = newMessage;
        setNewMessage(""); // Optimistic clear

        const { error } = await supabase.from("private_messages").insert({
            sender_id: currentUserId,
            receiver_id: targetUserId,
            content: msgContent
        });

        if (error) {
            console.error("Error sending message:", error);
            alert("No se pudo enviar el mensaje");
            setNewMessage(msgContent); // Revert on error
        }
        setSending(false);
    };

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
                        </div>
                    </Card>

                    <Card className="flex flex-col h-[400px] bg-white dark:bg-gray-800 border-none shadow-sm overflow-hidden">
                        <div className="p-4 bg-purple-600 text-white font-bold flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" /> Chat con {profile.full_name?.split(' ')[0]}
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
                            {messages.length === 0 ? (
                                <div className="text-center text-gray-400 text-sm py-10">
                                    ¡Salúda a {profile.full_name?.split(' ')[0]}! <br />
                                    <span className="text-xs opacity-70">Los mensajes desaparecen en 12h</span>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender_id === currentUserId;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${isMe
                                                    ? 'bg-purple-600 text-white rounded-br-none'
                                                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm rounded-bl-none'
                                                }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Escribe..."
                                className="bg-gray-100 dark:bg-gray-900 border-transparent focus:bg-white transition-all rounded-full px-4"
                            />
                            <Button
                                className="bg-purple-600 text-white hover:bg-purple-700 rounded-full h-10 w-10 p-0 shrink-0"
                                onClick={handleSendMessage}
                                disabled={sending || !newMessage.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Feed */}
                <div className="lg:col-span-2">
                    <h3 className="font-bold text-xl mb-4 text-gray-800 dark:text-white">Actividad Reciente</h3>
                    {currentUserId && (
                        <CommunityFeed currentUserId={currentUserId} targetUserId={targetUserId} showCreatePost={false} />
                    )}
                </div>
            </div>
        </div>
    );
}
