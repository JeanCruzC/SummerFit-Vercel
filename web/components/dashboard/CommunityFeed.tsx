"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FeedItem } from "@/types";
import { Card, Button, Input } from "@/components/ui";
import { Send, Heart, MessageCircle, Share2, Dumbbell, Trophy, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function CommunityFeed({ currentUserId, targetUserId }: { currentUserId: string, targetUserId?: string }) {
    const [posts, setPosts] = useState<FeedItem[]>([]);
    const [newPost, setNewPost] = useState("");
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);

    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        fetchFeed();
        fetchMyProfile();
    }, [targetUserId]); // Refetch if target changes

    const fetchMyProfile = async () => {
        const supabase = createClient();
        if (currentUserId) {
            const { data } = await supabase.from("profiles").select("*").eq("user_id", currentUserId).single();
            setUserProfile(data);
        }
    };

    const fetchFeed = async () => {
        const supabase = createClient();

        // Build query
        let query = supabase
            .from("activity_feed")
            .select("*, profiles(*)")
            .order("created_at", { ascending: false })
            .limit(20);

        if (targetUserId) {
            query = query.eq('user_id', targetUserId);
        }

        const { data, error } = await query;

        if (data && !error) {
            // Map profiles to user property
            const formattedPosts = data.map(item => ({
                ...item,
                user: item.profiles
            }));
            setPosts(formattedPosts as FeedItem[]);
        }
        setLoading(false);
    };

    const handlePost = async () => {
        if (!newPost.trim() || !currentUserId) return;
        setPosting(true);

        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("activity_feed")
                .insert({
                    user_id: currentUserId,
                    type: 'post',
                    content: newPost,
                    metadata: {}
                })
                .select("*, profiles(*)")
                .single();

            if (error) throw error;

            if (data) {
                const newPostItem = { ...data, user: data.profiles || userProfile } as FeedItem;
                setPosts([newPostItem, ...posts]);
                setNewPost("");
            }
        } catch (error: any) {
            console.error("Error creating post:", error);
            alert(`Error al publicar: ${error.message || 'Intenta de nuevo'}`);
        } finally {
            setPosting(false);
        }
    };

    // Ctrl + Enter to submit
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handlePost();
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'workout': return <Dumbbell className="h-5 w-5 text-blue-500" />;
            case 'streak': return <Flame className="h-5 w-5 text-orange-500" />;
            case 'weight_goal': return <Trophy className="h-5 w-5 text-yellow-500" />;
            default: return <MessageCircle className="h-5 w-5 text-purple-500" />;
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Create Post - Twitter Style */}
            <Card className="p-4 overflow-hidden border-none shadow-sm dark:bg-gray-800">
                <div className="flex gap-4">
                    <div className="flex-shrink-0">
                        {userProfile?.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="Me" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                            <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                {(userProfile?.full_name || "Y")[0]}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <textarea
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="¿Qué estás pensando hoy? Comparte tu progreso..."
                            className="w-full resize-none bg-transparent text-lg placeholder-gray-400 border-none focus:ring-0 p-2 min-h-[80px]"
                        />
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center">
                            <div className="flex gap-2 text-purple-500">
                                {/* Future Interactions */}
                            </div>
                            <Button
                                size="sm"
                                onClick={handlePost}
                                disabled={posting || !newPost.trim()}
                                className="rounded-full px-6 font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                            >
                                {posting ? "Publicando..." : "Publicar"}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Feed List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Cargando actividad...</div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                        <p className="text-gray-500">Aún no hay actividad reciente.</p>
                        <p className="text-sm text-gray-400">¡Sé el primero en publicar algo!</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {posts.map((post) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                layout
                            >
                                <Card className="p-5">
                                    <div className="flex gap-3 mb-3">
                                        {/* Avatar */}
                                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                                            {post.user?.avatar_url ? (
                                                <img src={post.user.avatar_url} alt="User" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                                    {(post.user?.full_name || "U")[0]}
                                                </div>
                                            )}
                                        </div>

                                        {/* Header */}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-semibold text-gray-900 dark:text-white block">
                                                        {post.user?.full_name || "Usuario"}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
                                                    </span>
                                                </div>
                                                <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full">
                                                    {getIcon(post.type)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="mb-4 pl-13">
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {post.content}
                                        </p>

                                        {/* Auto-generated Metadata Badge (Optional) */}
                                        {post.type === 'streak' && (
                                            <div className="mt-3 inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-lg text-sm font-medium">
                                                <Flame className="h-4 w-4" /> Racha de Fuego
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-6 text-gray-500 text-sm border-t pt-3 border-gray-100 dark:border-gray-800">
                                        <button className="flex items-center gap-1.5 hover:text-red-500 transition-colors">
                                            <Heart className="h-4 w-4" /> {post.likes_count || 0}
                                        </button>
                                        <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                                            <MessageCircle className="h-4 w-4" /> Comentar
                                        </button>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
