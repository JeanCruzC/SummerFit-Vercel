"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Target, Flame, Calendar, TrendingDown, Award } from "lucide-react";

interface SuccessViewProps {
    profile: {
        weight_kg: number;
        target_weight_kg: number;
        goal: string;
    };
    projection: {
        daily_calories: number;
        weekly_rate: number;
        weeks: number;
        months: number;
        target_date: string;
    };
    macros: {
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        calories: number;
    };
    onContinue: () => void;
}

/**
 * SuccessView - Fitia-style completion screen with projection curve and macro donut
 * Shown at end of onboarding or when viewing plan summary
 */
export default function SuccessView({ profile, projection, macros, onContinue }: SuccessViewProps) {

    // Generate milestone points for projection curve
    const milestones = useMemo(() => {
        const weightDiff = profile.weight_kg - profile.target_weight_kg;
        const weeksTotal = projection.weeks;
        const points = [];

        // Create 5 milestone points
        for (let i = 0; i <= 4; i++) {
            const weekNum = Math.round(weeksTotal * (i / 4));
            const weightAtPoint = profile.weight_kg - (weightDiff * (i / 4));
            points.push({
                week: weekNum,
                weight: Math.round(weightAtPoint * 10) / 10,
                isTarget: i === 4
            });
        }
        return points;
    }, [profile, projection]);

    // Calculate donut segments
    const donutData = useMemo(() => {
        const total = macros.protein_g * 4 + macros.carbs_g * 4 + macros.fat_g * 9;
        return {
            protein: (macros.protein_g * 4 / total) * 100,
            carbs: (macros.carbs_g * 4 / total) * 100,
            fat: (macros.fat_g * 9 / total) * 100,
        };
    }, [macros]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Success Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="inline-flex items-center justify-center h-20 w-20 bg-emerald-500 rounded-full mb-4 shadow-lg"
                    >
                        <CheckCircle className="h-10 w-10 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-black text-zinc-900 mb-2">¡Todo Listo!</h1>
                    <p className="text-zinc-600">Tu plan personalizado está listo</p>
                </div>

                {/* Projection Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-6 mb-6"
                >
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-4">
                        <Target className="h-4 w-4" />
                        <span>Tu Proyección</span>
                    </div>

                    {/* Weight Curve Visualization */}
                    <div className="relative h-32 mb-4">
                        <svg viewBox="0 0 300 100" className="w-full h-full">
                            {/* Curve path */}
                            <path
                                d={`M 10 20 Q 75 30, 150 50 T 290 80`}
                                fill="none"
                                stroke="url(#gradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#0d9488" />
                                </linearGradient>
                            </defs>

                            {/* Milestone dots */}
                            {milestones.map((m, i) => (
                                <g key={i}>
                                    <circle
                                        cx={10 + (280 * (i / 4))}
                                        cy={20 + (60 * (i / 4))}
                                        r={m.isTarget ? 8 : 5}
                                        fill={m.isTarget ? "#10b981" : "#a7f3d0"}
                                        stroke="white"
                                        strokeWidth="2"
                                    />
                                    <text
                                        x={10 + (280 * (i / 4))}
                                        y={20 + (60 * (i / 4)) + 20}
                                        fontSize="10"
                                        fill="#71717a"
                                        textAnchor="middle"
                                    >
                                        {m.weight}kg
                                    </text>
                                </g>
                            ))}
                        </svg>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-black text-zinc-900">{profile.weight_kg}</div>
                            <div className="text-xs text-zinc-500">Actual</div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-emerald-600 flex items-center justify-center gap-1">
                                <TrendingDown className="h-5 w-5" />
                                {projection.weekly_rate}
                            </div>
                            <div className="text-xs text-zinc-500">kg/semana</div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-zinc-900">{profile.target_weight_kg}</div>
                            <div className="text-xs text-zinc-500">Meta</div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-emerald-500" />
                        <span className="font-bold text-zinc-700">Meta: {projection.target_date}</span>
                        <span className="text-zinc-400">({projection.weeks} semanas)</span>
                    </div>
                </motion.div>

                {/* Macro Donut Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-6 mb-6"
                >
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-4">
                        <Flame className="h-4 w-4" />
                        <span>Tu Objetivo Nutricional</span>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Donut */}
                        <div className="relative h-32 w-32">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                {/* Protein */}
                                <circle
                                    cx="18" cy="18" r="15.915"
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="3"
                                    strokeDasharray={`${donutData.protein} ${100 - donutData.protein}`}
                                    strokeDashoffset="0"
                                />
                                {/* Carbs */}
                                <circle
                                    cx="18" cy="18" r="15.915"
                                    fill="none"
                                    stroke="#fbbf24"
                                    strokeWidth="3"
                                    strokeDasharray={`${donutData.carbs} ${100 - donutData.carbs}`}
                                    strokeDashoffset={`${-donutData.protein}`}
                                />
                                {/* Fat */}
                                <circle
                                    cx="18" cy="18" r="15.915"
                                    fill="none"
                                    stroke="#ef4444"
                                    strokeWidth="3"
                                    strokeDasharray={`${donutData.fat} ${100 - donutData.fat}`}
                                    strokeDashoffset={`${-(donutData.protein + donutData.carbs)}`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-zinc-900">{macros.calories}</span>
                                <span className="text-xs text-zinc-500">kcal</span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                                    <span className="text-sm text-zinc-700">Proteína</span>
                                </div>
                                <span className="font-bold text-zinc-900">{macros.protein_g}g</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                                    <span className="text-sm text-zinc-700">Carbos</span>
                                </div>
                                <span className="font-bold text-zinc-900">{macros.carbs_g}g</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-red-500" />
                                    <span className="text-sm text-zinc-700">Grasas</span>
                                </div>
                                <span className="font-bold text-zinc-900">{macros.fat_g}g</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* CTA Button */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    onClick={onContinue}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all"
                >
                    <span className="flex items-center justify-center gap-2">
                        <Award className="h-5 w-5" />
                        Empezar
                    </span>
                </motion.button>
            </motion.div>
        </div>
    );
}
