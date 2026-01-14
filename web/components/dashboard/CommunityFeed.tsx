"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FeedItem, FeedComment } from "@/types";
import { Card, Button, Input, Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { Send, Heart, MessageCircle, Share2, Dumbbell, Trophy, Flame, MoreHorizontal, Repeat, BarChart2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function CommunityFeed({ currentUserId, targetUserId, showCreatePost = true }: { currentUserId: string, targetUserId?: string, showCreatePost?: boolean }) {
    const [posts, setPosts] = useState<FeedItem[]>([]);
    const [newPost, setNewPost] = useState("");
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);

    // Commenting State
    const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState<Record<string, FeedComment[]>>({}); // Map: post_id -> comments[]

    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        fetchFeed();
        fetchMyProfile();
    }, [targetUserId]);

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
            // Enhanced fetch: Get likes and comments counts + my like status
            // Note: For now, we do N+1 selects mostly or rely on client data. 
            // Ideally, we'd use a view or a specialized RPC function for performance.
            // For MVP, we will fetch basic data and then fetch interaction details asynchronously or lazily.

            // PREFETCH INTERACTION DATA (MVP Approach: separate calls per post - optimize later with View)
            const enrichedPosts = await Promise.all(data.map(async (item) => {
                const { count: likesCount } = await supabase.from("feed_likes").select("id", { count: 'exact', head: true }).eq("post_id", item.id);
                const { count: commentsCount } = await supabase.from("feed_comments").select("id", { count: 'exact', head: true }).eq("post_id", item.id);
                const { data: myLike } = await supabase.from("feed_likes").select("id").eq("post_id", item.id).eq("user_id", currentUserId).single();

                return {
                    ...item,
                    user: item.profiles,
                    likes_count: likesCount || 0,
                    comments_count: commentsCount || 0,
                    has_liked: !!myLike
                };
            }));

            setPosts(enrichedPosts as FeedItem[]);
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
                const newPostItem: FeedItem = {
                    ...data,
                    user: data.profiles || userProfile,
                    likes_count: 0,
                    comments_count: 0,
                    has_liked: false
                };
                setPosts([newPostItem, ...posts]);
                setNewPost("");
            }
        } catch (error: any) {
            console.error("Error creating post:", error);
        } finally {
            setPosting(false);
        }
    };

    const toggleLike = async (postId: string, currentLiked: boolean) => {
        // Optimistic Update
        setPosts(current => current.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    has_liked: !currentLiked,
                    likes_count: (p.likes_count || 0) + (currentLiked ? -1 : 1)
                };
            }
            return p;
        }));

        const supabase = createClient();
        if (currentLiked) {
            await supabase.from("feed_likes").delete().eq("post_id", postId).eq("user_id", currentUserId);
        } else {
            await supabase.from("feed_likes").insert({ post_id: postId, user_id: currentUserId });
        }
    };

    const loadComments = async (postId: string) => {
        if (comments[postId]) {
            setActiveCommentPostId(postId === activeCommentPostId ? null : postId);
            return;
        }

        const supabase = createClient();
        const { data } = await supabase
            .from("feed_comments")
            .select("*, profiles(*)") // Assuming generic relation, else manual join
            .eq("post_id", postId)
            .order("created_at", { ascending: true });

        // Manual join fix if profiles relation isn't auto-detected (likely need to select user manually)
        // For this code to work clean, assume 'user:profiles(*)' or similar relation setup.
        // If not, we map it manually. Activity Feed had FK, comments table might rely on user_id FK too.

        // Let's do a reliable fetch assuming simple FK
        const { data: commentsData, error } = await supabase
            .from("feed_comments")
            .select("*, user:profiles(*)")
            .eq("post_id", postId)
            .order("created_at", { ascending: true });

        if (commentsData) {
            setComments(prev => ({ ...prev, [postId]: commentsData as any }));
            setActiveCommentPostId(postId);
        }
    };

    const submitComment = async (postId: string) => {
        if (!commentText.trim()) return;

        // Optimistic UI updates could be tricky for comments list, let's just push and reload list
        const supabase = createClient();
        const { data, error } = await supabase
            .from("feed_comments")
            .insert({
                post_id: postId,
                user_id: currentUserId,
                content: commentText
            })
            .select("*, user:profiles(*)")
            .single();

        if (data) {
            setComments(prev => ({
                ...prev,
                [postId]: [...(prev[postId] || []), data as any]
            }));
            setCommentText("");

            // Update interaction counter
            setPosts(current => current.map(p => {
                if (p.id === postId) {
                    return { ...p, comments_count: (p.comments_count || 0) + 1 };
                }
                return p;
            }));
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
            case 'workout': return <Dumbbell className="h-4 w-4 text-blue-500" />;
            case 'streak': return <Flame className="h-4 w-4 text-orange-500" />;
            case 'weight_goal': return <Trophy className="h-4 w-4 text-yellow-500" />;
            default: return null;
        }
    };

    return (
        <div className="max-w-xl mx-auto border-x border-gray-100 dark:border-gray-800 min-h-screen bg-white dark:bg-black">
            {/* Create Post Area */}
            {showCreatePost && (
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={userProfile?.avatar_url} />
                                <AvatarFallback className="bg-purple-100 text-purple-600">
                                    {(userProfile?.full_name || "Y")[0]}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={newPost}
                                onChange={(e) => setNewPost(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="¿Qué está pasando?"
                                className="w-full resize-none bg-transparent text-xl placeholder-gray-500 border-none focus:ring-0 p-2 min-h-[50px] outline-none text-gray-900 dark:text-white"
                                rows={2}
                            />
                            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between items-center mt-2">
                                <div className="flex gap-3 text-purple-500">
                                    <Button variant="ghost" size="icon" className="text-purple-500 hover:bg-purple-50 rounded-full h-8 w-8">
                                        <BarChart2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-purple-500 hover:bg-purple-50 rounded-full h-8 w-8">
                                        <Dumbbell className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handlePost}
                                    disabled={posting || !newPost.trim()}
                                    className="rounded-full px-5 font-bold bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50"
                                >
                                    {posting ? "Posteando..." : "Postear"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Feed List */}
            <div className="">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-10 px-4">
                        <p className="text-gray-500">Aún no hay actividad reciente.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {posts.map((post) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors p-4 cursor-pointer"
                            >
                                <div className="flex gap-3">
                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={post.user?.avatar_url} />
                                            <AvatarFallback className="bg-gray-200">
                                                {(post.user?.full_name || "U")[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>

                                    {/* Content Column */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                                                <span className="font-bold text-gray-900 dark:text-white truncate">
                                                    {post.user?.full_name || "Usuario"}
                                                </span>
                                                <span className="text-gray-500 text-sm">@{post.user?.full_name?.replace(/\s/g, '').toLowerCase() || "usuario"}</span>
                                                <span className="text-gray-500 text-sm">·</span>
                                                <span className="text-gray-500 text-sm hover:underline">
                                                    {formatDistanceToNow(new Date(post.created_at), { locale: es })}
                                                </span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 rounded-full hover:bg-blue-50 hover:text-blue-500 -mt-2 -mr-2">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Post Text */}
                                        <div className="text-gray-900 dark:text-white whitespace-pre-wrap text-[15px] leading-normal mt-0.5">
                                            {getIcon(post.type) && <span className="inline-block mr-2 align-text-bottom">{getIcon(post.type)}</span>}
                                            {post.content}
                                        </div>

                                        {/* Optional Metadata Display */}
                                        {post.type === 'workout' && (
                                            <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                <div className="h-32 bg-gray-100 flex items-center justify-center text-gray-400">
                                                    {/* Future: Map or Stats Image */}
                                                    <BarChart2 className="h-8 w-8" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions Bar (Twitter Style) */}
                                        <div className="flex justify-between items-center text-gray-500 mt-3 max-w-md">
                                            <button
                                                onClick={() => loadComments(post.id)}
                                                className="group flex items-center gap-2 text-sm hover:text-blue-500 transition-colors"
                                            >
                                                <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                                                    <MessageCircle className="h-4.5 w-4.5" />
                                                </div>
                                                <span>{post.comments_count || 0}</span>
                                            </button>

                                            <button className="group flex items-center gap-2 text-sm hover:text-green-500 transition-colors">
                                                <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                                                    <Repeat className="h-4.5 w-4.5" />
                                                </div>
                                                <span>0</span>
                                            </button>

                                            <button
                                                onClick={() => toggleLike(post.id, !!post.has_liked)}
                                                className={`group flex items-center gap-2 text-sm transition-colors ${post.has_liked ? 'text-pink-600' : 'hover:text-pink-600'}`}
                                            >
                                                <div className="p-2 rounded-full group-hover:bg-pink-50 transition-colors">
                                                    <Heart className={`h-4.5 w-4.5 ${post.has_liked ? 'fill-current' : ''}`} />
                                                </div>
                                                <span>{post.likes_count || 0}</span>
                                            </button>

                                            <button className="group flex items-center gap-2 text-sm hover:text-blue-500 transition-colors">
                                                <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                                                    <Share2 className="h-4.5 w-4.5" />
                                                </div>
                                            </button>
                                        </div>

                                        {/* Comments Expand Area */}
                                        <AnimatePresence>
                                            {activeCommentPostId === post.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 overflow-hidden"
                                                >

                                                    {/* Existing Comments */}
                                                    <div className="space-y-3 mb-4 pl-2 border-l-2 border-gray-100">
                                                        {comments[post.id]?.map(comment => (
                                                            <div key={comment.id} className="text-sm">
                                                                <span className="font-bold text-gray-900 mr-2">{comment.user?.full_name}</span>
                                                                <span className="text-gray-700">{comment.content}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Reply Input */}
                                                    <div className="flex gap-3 items-center">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={userProfile?.avatar_url} />
                                                            <AvatarFallback className="text-xs">
                                                                {(userProfile?.full_name || "Y")[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <Input
                                                            value={commentText}
                                                            onChange={(e) => setCommentText(e.target.value)}
                                                            placeholder="Postea tu respuesta"
                                                            className="flex-1 border-none focus-visible:ring-0 bg-gray-50 dark:bg-gray-800 rounded-full h-10"
                                                            onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            disabled={!commentText.trim()}
                                                            onClick={() => submitComment(post.id)}
                                                            className="rounded-full bg-purple-500 hover:bg-purple-600 text-white"
                                                        >
                                                            Responder
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
