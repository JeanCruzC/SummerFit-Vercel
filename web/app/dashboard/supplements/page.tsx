"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Card, Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getProfile } from "@/lib/supabase/database";
import { getSupplementRecommendations, getSupplementDisclaimer } from "@/lib/supplements";
import { UserProfile, Supplement } from "@/types";

export default function SupplementsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [supplements, setSupplements] = useState<Supplement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }

            const prof = await getProfile(session.user.id);
            if (prof) {
                setProfile(prof);
                const recs = getSupplementRecommendations(prof.goal, prof.diet_type);
                setSupplements(recs);
            }
            setLoading(false);
        };
        load();
    }, [router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Suplementos Recomendados</h1>
                <p className="text-gray-500 mt-1">
                    Basado en tu objetivo ({profile?.goal}) y dieta ({profile?.diet_type}).
                </p>
            </div>

            <Alert type="warning">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <div className="font-medium">Disclaimer</div>
                        <p className="text-sm mt-1">{getSupplementDisclaimer()}</p>
                    </div>
                </div>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supplements.map((supp, i) => (
                    <Card key={i} className="hover:border-purple-300 transition">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 grid place-items-center text-2xl">
                                {supp.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{supp.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{supp.description}</p>
                                <div className="mt-3 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium inline-block">
                                    {supp.benefit}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {supplements.length === 0 && (
                <Card className="text-center py-12">
                    <Zap className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400">Sin recomendaciones</h3>
                    <p className="text-gray-500 mt-2">Completa tu perfil para recibir sugerencias personalizadas.</p>
                </Card>
            )}
        </motion.div>
    );
}
