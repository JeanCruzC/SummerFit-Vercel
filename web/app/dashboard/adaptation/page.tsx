"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdaptationEngine } from "@/lib/intelligence/adaptation_engine";
import { TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

export default function AdaptationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [weightHistory, setWeightHistory] = useState<any[]>([]);
    const [equipment, setEquipment] = useState<string[]>([]);
    const [adaptationPlan, setAdaptationPlan] = useState<{
        triggers: any[];
        priority: 'none' | 'low' | 'medium' | 'high';
        summary: string;
    } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
        const { data: weightData } = await supabase.from('weight_history').select('*').eq('user_id', user.id).order('recorded_at', { ascending: true }).limit(10);
        const { data: equipmentData } = await supabase.from('user_equipment').select('equipment_type').eq('user_id', user.id);

        setProfile(profileData);
        setWeightHistory(weightData || []);
        setEquipment((equipmentData || []).map(e => e.equipment_type));

        if (profileData && weightData) {
            const plan = AdaptationEngine.generateAdaptationPlan(
                profileData,
                weightData.map(w => ({ date: w.recorded_at, weight: w.weight_kg })),
                (equipmentData || []).map(e => e.equipment_type)
            );
            setAdaptationPlan(plan);
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const priorityColors = {
        none: 'bg-green-50 border-green-200 text-green-700',
        low: 'bg-blue-50 border-blue-200 text-blue-700',
        medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        high: 'bg-red-50 border-red-200 text-red-700'
    };

    const priorityIcons = {
        none: <CheckCircle className="h-6 w-6" />,
        low: <TrendingUp className="h-6 w-6" />,
        medium: <AlertTriangle className="h-6 w-6" />,
        high: <AlertTriangle className="h-6 w-6" />
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                        <RefreshCw className="h-7 w-7 text-purple-500" />
                        Adaptación Inteligente
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                        El sistema analiza tu progreso y recomienda ajustes
                    </p>
                </div>

                {adaptationPlan && (
                    <>
                        <div className={`rounded-3xl p-6 border-2 mb-8 ${priorityColors[adaptationPlan.priority]}`}>
                            <div className="flex items-start gap-4">
                                {priorityIcons[adaptationPlan.priority]}
                                <div className="flex-1">
                                    <h2 className="text-xl font-black mb-2">Estado: {adaptationPlan.priority === 'none' ? 'Óptimo' : adaptationPlan.priority === 'high' ? 'Requiere Acción' : 'Revisar'}</h2>
                                    <p className="text-sm font-medium">{adaptationPlan.summary}</p>
                                </div>
                            </div>
                        </div>

                        {adaptationPlan.triggers.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Recomendaciones</h3>
                                {adaptationPlan.triggers.map((trigger: any, idx: number) => (
                                    <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${trigger.severity === 'major' ? 'bg-red-100 text-red-600' :
                                                    trigger.severity === 'moderate' ? 'bg-yellow-100 text-yellow-600' :
                                                        'bg-blue-100 text-blue-600'
                                                }`}>
                                                {trigger.type === 'weight_change' ? '⚖️' : trigger.type === 'equipment_change' ? '🏋️' : '📊'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${trigger.severity === 'major' ? 'bg-red-100 text-red-700' :
                                                            trigger.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {trigger.severity === 'major' ? 'URGENTE' : trigger.severity === 'moderate' ? 'IMPORTANTE' : 'INFO'}
                                                    </span>
                                                    <span className="text-xs text-zinc-500 uppercase font-bold">{trigger.type.replace('_', ' ')}</span>
                                                </div>
                                                <p className="text-zinc-900 dark:text-white font-medium mb-3">{trigger.recommendation}</p>
                                                <button
                                                    onClick={() => {
                                                        if (trigger.action === 'change_split') router.push('/dashboard/generator');
                                                        else if (trigger.action === 'add_cardio') router.push('/dashboard/profile');
                                                    }}
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-500 transition-all"
                                                >
                                                    {trigger.action === 'change_split' ? 'Regenerar Rutina' :
                                                        trigger.action === 'add_cardio' ? 'Ajustar Plan' :
                                                            trigger.action === 'adjust_calories' ? 'Ajustar Nutrición' :
                                                                'Ver Detalles'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-800">
                                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">¡Todo en orden!</h3>
                                <p className="text-zinc-600 dark:text-zinc-400">Tu progreso está en el camino correcto. Continúa con tu plan actual.</p>
                            </div>
                        )}

                        <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Historial de Peso</h3>
                            <div className="space-y-2">
                                {weightHistory.slice(-5).reverse().map((w, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{new Date(w.recorded_at).toLocaleDateString()}</span>
                                        <span className="text-lg font-bold text-zinc-900 dark:text-white">{w.weight_kg} kg</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
