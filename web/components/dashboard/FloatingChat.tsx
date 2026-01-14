"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card } from "@/components/ui";
import { MessageCircle, X, Send, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingChatProps {
    currentUserId: string;
    targetUserId: string;
    targetUserName: string;
    targetUserAvatar?: string;
}

export default function FloatingChat({ currentUserId, targetUserId, targetUserName, targetUserAvatar }: FloatingChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

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

            if (data) {
                setMessages(data);
                // If we have messages, maybe auto-open? Or just show a badge. For now, let user open.
            }
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
                        // If closed, maybe show notification dot?
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

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            <div className="pointer-events-auto">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="mb-4 w-80 md:w-96 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col"
                            style={{ height: "500px", maxHeight: "80vh" }}
                        >
                            {/* Header */}
                            <div className="p-3 bg-purple-600 text-white flex justify-between items-center shadow-sm shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        {targetUserAvatar ? (
                                            <img src={targetUserAvatar} className="w-8 h-8 rounded-full border border-white/30" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                                                {targetUserName[0]}
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-purple-600 rounded-full"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">{targetUserName}</h3>
                                        <p className="text-xs text-purple-100">En línea</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-400 text-xs py-8 h-full flex flex-col justify-center items-center">
                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2 text-purple-500">
                                            <MessageCircle className="w-6 h-6" />
                                        </div>
                                        <p>¡Salúda a {targetUserName.split(' ')[0]}!</p>
                                        <p className="mt-1 opacity-70">Los mensajes desaparecen en 12h</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMe = msg.sender_id === currentUserId;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${isMe
                                                        ? 'bg-purple-600 text-white rounded-br-none'
                                                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm rounded-bl-none'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2 shrink-0">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Escribe un mensaje..."
                                    className="bg-gray-100 dark:bg-gray-900 border-transparent focus:bg-white transition-all rounded-full px-4 text-sm h-9"
                                />
                                <Button
                                    className="bg-purple-600 text-white hover:bg-purple-700 rounded-full h-9 w-9 p-0 shrink-0 shadow-sm"
                                    onClick={handleSendMessage}
                                    disabled={sending || !newMessage.trim()}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Toggle Button */}
                {!isOpen && (
                    <motion.button
                        layoutId="chat-bubble"
                        onClick={() => setIsOpen(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="h-14 w-14 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center hover:bg-purple-700 transition-colors relative"
                    >
                        <MessageCircle className="h-7 w-7" />
                        {/* Unread badge logic could go here */}
                    </motion.button>
                )}
            </div>
        </div>
    );
}
