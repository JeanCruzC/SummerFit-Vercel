"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingDown, Scale, Target } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Card, Button, Input, Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getProfile, getWeightHistory, recordWeight, getDailyLogsRange } from "@/lib/supabase/database";
import { UserProfile } from "@/types";

export default function ProgressPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string>("");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [weightHistory, setWeightHistory] = useState<{ recorded_at: string; weight_kg: number }[]>([]);
    const [dailyLogs, setDailyLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newWeight, setNewWeight] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }
            setUserId(session.user.id);

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
            const today = new Date().toISOString().split("T")[0];

            const [prof, weights, logs] = await Promise.all([
                getProfile(session.user.id),
                getWeightHistory(session.user.id, 30),
                getDailyLogsRange(session.user.id, thirtyDaysAgo, today),
            ]);

            setProfile(prof);
            setWeightHistory(weights);
            setDailyLogs(logs);
            if (prof) setNewWeight(prof.weight_kg);
            setLoading(false);
        };
        load();
    }, [router]);

    const handleSaveWeight = async () => {
        if (!userId || newWeight <= 0) return;
        setSaving(true);
        const today = new Date().toISOString().split("T")[0];
        const success = await recordWeight(userId, today, newWeight);
        if (success) {
            const weights = await getWeightHistory(userId, 30);
            setWeightHistory(weights);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
        setSaving(false);
    };

    // Chart data
    const weightChartData = useMemo(() => {
        return [...weightHistory]
            .reverse()
            .map(w => ({
                date: new Date(w.recorded_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
                peso: w.weight_kg,
            }));
    }, [weightHistory]);

    const caloriesChartData = useMemo(() => {
        return dailyLogs.map(l => ({
            date: new Date(l.log_date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
            kcal: l.calories_consumed || 0,
        }));
    }, [dailyLogs]);

    // Stats
    const stats = useMemo(() => {
        if (weightHistory.length < 2 || !profile) return null;

        const latest = weightHistory[0]?.weight_kg || profile.weight_kg;
        const oldest = weightHistory[weightHistory.length - 1]?.weight_kg || latest;
        const change = Math.round((latest - oldest) * 10) / 10;
        const progressPct = profile.target_weight_kg !== profile.weight_kg
            ? Math.round(((oldest - latest) / (oldest - profile.target_weight_kg)) * 100)
            : 100;

        return {
            latest,
            oldest,
            change,
            progressPct: Math.max(0, Math.min(100, progressPct)),
            remaining: Math.abs(latest - profile.target_weight_kg),
        };
    }, [weightHistory, profile]);

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
                <h1 className="text-3xl font-bold">Tu Progreso</h1>
                <p className="text-gray-500 mt-1">Visualiza tu evolución a lo largo del tiempo.</p>
            </div>

            {saved && <Alert type="success">✅ Peso registrado correctamente.</Alert>}

            {/* Quick Weight Entry */}
            <Card>
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">Registrar peso de hoy</h3>
                        <Input
                            type="number"
                            step={0.1}
                            min={30}
                            max={300}
                            value={newWeight}
                            onChange={e => setNewWeight(parseFloat(e.target.value) || 0)}
                            placeholder="Peso en kg"
                        />
                    </div>
                    <Button onClick={handleSaveWeight} disabled={saving}>
                        <Scale className="h-4 w-4" />
                        {saving ? "Guardando..." : "Guardar"}
                    </Button>
                </div>
            </Card>

            {/* Stats Summary */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="text-center">
                        <Scale className="h-6 w-6 text-purple-500 mx-auto" />
                        <div className="text-2xl font-bold mt-2">{stats.latest} kg</div>
                        <div className="text-sm text-gray-500">Peso actual</div>
                    </Card>
                    <Card className="text-center">
                        <TrendingDown className="h-6 w-6 text-green-500 mx-auto" />
                        <div className={`text-2xl font-bold mt-2 ${stats.change < 0 ? 'text-green-500' : stats.change > 0 ? 'text-red-500' : ''}`}>
                            {stats.change > 0 ? '+' : ''}{stats.change} kg
                        </div>
                        <div className="text-sm text-gray-500">Cambio (30 días)</div>
                    </Card>
                    <Card className="text-center">
                        <Target className="h-6 w-6 text-amber-500 mx-auto" />
                        <div className="text-2xl font-bold mt-2">{stats.remaining} kg</div>
                        <div className="text-sm text-gray-500">Para tu meta</div>
                    </Card>
                    <Card className="text-center">
                        <div className="h-6 w-6 mx-auto text-2xl">🎯</div>
                        <div className="text-2xl font-bold mt-2">{stats.progressPct}%</div>
                        <div className="text-sm text-gray-500">Progreso</div>
                    </Card>
                </div>
            )}

            {/* Weight Chart */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Evolución del peso</h3>
                {weightChartData.length > 0 ? (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weightChartData}>
                                <defs>
                                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
                                <YAxis domain={['auto', 'auto']} tick={{ fill: "#6b7280", fontSize: 12 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="peso" stroke="#a855f7" strokeWidth={2} fill="url(#weightGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-8">No hay datos de peso registrados.</p>
                )}
            </Card>

            {/* Calories Chart */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Calorías consumidas</h3>
                {caloriesChartData.length > 0 ? (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={caloriesChartData}>
                                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
                                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="kcal" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-8">No hay datos de calorías registrados.</p>
                )}
            </Card>
        </motion.div>
    );
}
