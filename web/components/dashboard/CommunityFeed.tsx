"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FeedItem } from "@/types";
import { Card, Button, Input } from "@/components/ui";
import { Send, Heart, MessageCircle, Share2, Dumbbell, Trophy, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function CommunityFeed({ currentUserId }: { currentUserId: string }) {
    const [posts, setPosts] = useState<FeedItem[]>([]);
    const [newPost, setNewPost] = useState("");
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        const supabase = createClient();

        // Fetch feed items joined with profiles
        const { data, error } = await supabase
            .from("activity_feed")
            .select("*, profiles(*)")
            .order("created_at", { ascending: false })
            .limit(20);

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
        if (!newPost.trim()) return;
        setPosting(true);

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

        if (data && !error) {
            const newPostItem = { ...data, user: data.profiles } as FeedItem;
            setPosts([newPostItem, ...posts]);
            setNewPost("");
        }
        setPosting(false);
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
            {/* Create Post */}
            <Card className="p-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <textarea
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            placeholder="¿Qué estás pensando hoy? Comparte tu progreso..."
                            className="w-full resize-none bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border-transparent focus:border-purple-500 focus:ring-0 transition h-24"
                        />
                    </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <div className="flex gap-2 text-gray-400">
                        {/* Future: Image upload button */}
                    </div>
                    <Button
                        size="sm"
                        onClick={handlePost}
                        disabled={posting || !newPost.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {posting ? "Publicando..." : "Publicar"} <Send className="ml-2 h-4 w-4" />
                    </Button>
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
