"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Smartphone, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SocialProfileReminder() {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    useEffect(() => {
        // Check if previously dismissed in this session
        if (sessionStorage.getItem("social_reminder_dismissed")) {
            return;
        }

        const checkProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("phone, location_name")
                .eq("user_id", user.id)
                .single();

            if (profile) {
                const missing = [];
                if (!profile.phone) missing.push("teléfono");
                if (!profile.location_name) missing.push("ubicación");

                if (missing.length > 0) {
                    setMissingFields(missing);
                    // Delay slightly to not annoy immediately on load
                    setTimeout(() => setIsVisible(true), 2000);
                }
            }
        };

        checkProfile();
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        sessionStorage.setItem("social_reminder_dismissed", "true");
    };

    if (!isVisible || isDismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                className="fixed bottom-6 right-6 z-50 max-w-sm w-full"
            >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-purple-100 dark:border-purple-900/30 p-4 relative overflow-hidden">
                    {/* Decorative background */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-bl-full -mr-4 -mt-4" />

                    <button
                        onClick={handleDismiss}
                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="flex gap-4">
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-purple-100 dark:bg-purple-900/30 grid place-items-center text-purple-600 dark:text-purple-400">
                            <MapPin className="h-6 w-6" />
                        </div>

                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                                Completa tu Perfil
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                                Añade tu {missingFields.join(" y ")} para encontrar compañeros de entrenamiento cerca de ti.
                            </p>

                            <Link
                                href="/dashboard/profile"
                                className="inline-flex items-center text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition group"
                            >
                                Actualizar ahora <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
