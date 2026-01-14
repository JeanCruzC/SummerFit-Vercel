"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Avatar, AvatarImage, AvatarFallback } from "@/components/ui";
import { MessageCircle, X, Send, ChevronLeft, Search, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface FloatingChatProps {
    currentUserId: string;
    targetUserId?: string; // Optional now, as we might start in Inbox
    targetUserName?: string;
    targetUserAvatar?: string;
}

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
}

interface Conversation {
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
}

export default function FloatingChat({ currentUserId, targetUserId: initialTargetId, targetUserName: initialTargetName, targetUserAvatar: initialTargetAvatar }: FloatingChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'inbox' | 'chat'>('chat'); // Default to chat if target provided

    // Active Chat State
    const [activePartnerId, setActivePartnerId] = useState<string | null>(initialTargetId || null);
    const [activePartnerName, setActivePartnerName] = useState<string>(initialTargetName || "Usuario");
    const [activePartnerAvatar, setActivePartnerAvatar] = useState<string | undefined>(initialTargetAvatar);

    // Data State
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Setup
    useEffect(() => {
        if (initialTargetId) {
            setActivePartnerId(initialTargetId);
            setActivePartnerName(initialTargetName || "Usuario");
            setActivePartnerAvatar(initialTargetAvatar);
            setView('chat');
        } else {
            setView('inbox');
        }
    }, [initialTargetId, initialTargetName, initialTargetAvatar]);

    // Auto-scroll
    useEffect(() => {
        if (isOpen && view === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen, view]);

    // Fetch Inbox (Recent Conversations)
    useEffect(() => {
        if (!isOpen || !currentUserId) return;

        const fetchInbox = async () => {
            const supabase = createClient();
            // Fetch recent messages involving me
            const { data } = await supabase
                .from("private_messages")
                .select("*, sender:sender_id(full_name, avatar_url), receiver:receiver_id(full_name, avatar_url)")
                .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
                .order("created_at", { ascending: false })
                .limit(50); // Fetch last 50 messages to build inbox

            if (data) {
                const convMap = new Map<string, Conversation>();

                data.forEach((msg: any) => {
                    const isSender = msg.sender_id === currentUserId;
                    const partnerId = isSender ? msg.receiver_id : msg.sender_id;
                    const partner = isSender ? msg.receiver : msg.sender;

                    if (!convMap.has(partnerId)) {
                        convMap.set(partnerId, {
                            partnerId,
                            partnerName: partner?.full_name || "Usuario",
                            partnerAvatar: partner?.avatar_url,
                            lastMessage: msg.content,
                            lastMessageTime: msg.created_at,
                            unreadCount: 0 // Todo: implement read status
                        });
                    }
                });

                setConversations(Array.from(convMap.values()));
            }
        };

        fetchInbox();
        // Subscribe to NEW messages for Inbox updates
        const supabase = createClient();
        const channel = supabase.channel(`inbox:${currentUserId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `receiver_id=eq.${currentUserId}` }, () => {
                fetchInbox(); // Refresh inbox on new message
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isOpen, currentUserId]);

    // Fetch Active Chat Messages
    useEffect(() => {
        if (!currentUserId || !activePartnerId || view !== 'chat') return;

        const fetchMessages = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("private_messages")
                .select("*")
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activePartnerId}),and(sender_id.eq.${activePartnerId},receiver_id.eq.${currentUserId})`)
                .order("created_at", { ascending: true });

            if (data) setMessages(data);
        };

        fetchMessages();

        const supabase = createClient();
        const channel = supabase
            .channel(`chat:${currentUserId}-${activePartnerId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'private_messages',
                filter: `receiver_id=in.(${currentUserId},${activePartnerId})`
            }, (payload) => {
                const msg = payload.new as Message;
                if (
                    (msg.sender_id === currentUserId && msg.receiver_id === activePartnerId) ||
                    (msg.sender_id === activePartnerId && msg.receiver_id === currentUserId)
                ) {
                    setMessages(prev => [...prev, msg]);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, activePartnerId, view]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUserId || !activePartnerId) return;
        setSending(true);

        const supabase = createClient();
        const msgContent = newMessage;
        setNewMessage("");

        const { error } = await supabase.from("private_messages").insert({
            sender_id: currentUserId,
            receiver_id: activePartnerId,
            content: msgContent
        });

        if (error) {
            console.error("Error sending message:", error);
            setNewMessage(msgContent);
        }
        setSending(false);
    };

    const openChat = (partnerId: string, name: string, avatar?: string) => {
        setActivePartnerId(partnerId);
        setActivePartnerName(name);
        setActivePartnerAvatar(avatar);
        setView('chat');
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            <div className="pointer-events-auto">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20, x: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20, x: 20, transition: { duration: 0.2 } }}
                            className="mb-4 w-80 md:w-96 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col origin-bottom-right"
                            style={{ height: "550px", maxHeight: "80vh" }}
                        >
                            {/* Header */}
                            <div className="p-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
                                {view === 'chat' ? (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setView('inbox')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                                        </button>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={activePartnerAvatar} />
                                            <AvatarFallback>{activePartnerName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{activePartnerName}</h3>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                <span className="text-[10px] text-gray-500 font-medium">En línea</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white px-2">Mensajes</h3>
                                )}

                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black/20">
                                {view === 'inbox' ? (
                                    // INBOX VIEW
                                    <div className="p-2 space-y-1">
                                        {conversations.length === 0 ? (
                                            <div className="text-center py-10 text-gray-400">
                                                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm">No tienes mensajes recientes</p>
                                            </div>
                                        ) : (
                                            conversations.map(conv => (
                                                <div
                                                    key={conv.partnerId}
                                                    onClick={() => openChat(conv.partnerId, conv.partnerName, conv.partnerAvatar)}
                                                    className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-gray-800 rounded-xl cursor-pointer transition-colors group"
                                                >
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={conv.partnerAvatar} />
                                                        <AvatarFallback>{conv.partnerName[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-baseline mb-0.5">
                                                            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{conv.partnerName}</h4>
                                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                                {formatDistanceToNow(new Date(conv.lastMessageTime), { locale: es, addSuffix: false }).replace('alrededor de ', '')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                                            {conv.lastMessage}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    // CHAT VIEW
                                    <div className="p-4 space-y-4">
                                        {messages.length === 0 && (
                                            <div className="text-center py-8">
                                                <Avatar className="h-16 w-16 mx-auto mb-3 bg-purple-100 text-purple-600">
                                                    <AvatarFallback className="text-xl">{activePartnerName[0]}</AvatarFallback>
                                                </Avatar>
                                                <p className="text-sm text-gray-500">Comienza a charlar con {activePartnerName}</p>
                                                <p className="text-xs text-purple-500 mt-1">Los mensajes son efímeros (12h)</p>
                                            </div>
                                        )}
                                        {messages.map((msg, i) => {
                                            const isMe = msg.sender_id === currentUserId;
                                            const showAvatar = !isMe && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);

                                            return (
                                                <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    {!isMe && (
                                                        <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                                                            {showAvatar ? (
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={activePartnerAvatar} />
                                                                    <AvatarFallback>{activePartnerName[0]}</AvatarFallback>
                                                                </Avatar>
                                                            ) : <div className="w-6" />}
                                                        </div>
                                                    )}

                                                    <div className={`max-w-[75%] space-y-1`}>
                                                        <div className={`px-4 py-2 text-sm break-words shadow-sm ${isMe
                                                            ? 'bg-purple-600 text-white rounded-2xl rounded-tr-none'
                                                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700'
                                                            }`}>
                                                            {msg.content}
                                                        </div>
                                                        <div className={`text-[10px] text-gray-400 ${isMe ? 'text-right' : 'text-left'} opacity-70`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </div>

                            {/* Footer Input */}
                            {view === 'chat' && (
                                <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-2 shrink-0 items-end">
                                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center px-3 py-1">
                                        <Input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Escribe un mensaje..."
                                            className="bg-transparent border-none focus-visible:ring-0 shadow-none px-0 h-9 text-sm"
                                        />
                                    </div>
                                    <Button
                                        className={`rounded-full h-10 w-10 p-0 shrink-0 shadow-sm transition-all ${newMessage.trim() ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-200 text-gray-400'
                                            }`}
                                        onClick={handleSendMessage}
                                        disabled={sending || !newMessage.trim()}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* New Launcher Style (Pill/Bar) */}
                {!isOpen && (
                    <motion.button
                        // layoutId removed to prevent glitching, simple scale animation instead
                        onClick={() => setIsOpen(true)}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-full pl-4 pr-1 py-1 cursor-pointer hover:border-purple-200 transition-colors"
                    >
                        <div className="flex flex-col items-start mr-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-white leading-none">Mensajes</span>
                            <span className="text-[10px] text-gray-500 font-medium">Bandeja de entrada</span>
                        </div>
                        <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-200 group-hover:bg-purple-700 transition-colors">
                            <MessageCircle className="h-5 w-5" />
                        </div>
                    </motion.button>
                )}
            </div>
        </div>
    );
}
