"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Dumbbell, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getUserEquipment, addUserEquipment, removeUserEquipment } from "@/lib/supabase/exercises";
import type { UserEquipment } from "@/types";

// Common equipment types
const EQUIPMENT_TYPES = [
    { value: "Peso corporal", label: "Peso corporal", icon: "💪", hasWeight: false },
    { value: "Barra", label: "Barra", icon: "🏋️", hasWeight: false },
    { value: "Mancuernas", label: "Mancuernas", icon: "🏋️‍♀️", hasWeight: true },
    { value: "Bandas", label: "Bandas elásticas", icon: "🎗️", hasWeight: false },
    { value: "Banco", label: "Banco", icon: "🪑", hasWeight: false },
    { value: "Kettlebell", label: "Kettlebell", icon: "⚫", hasWeight: true },
    { value: "Máquina", label: "Máquinas", icon: "🎰", hasWeight: false },
    { value: "Cable", label: "Poleas/Cables", icon: "🔗", hasWeight: false },
    { value: "Paralelas", label: "Barras paralelas", icon: "🤸", hasWeight: false },
    { value: "Cajón", label: "Cajón pliométrico", icon: "📦", hasWeight: false },
];

export default function EquipmentPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [equipment, setEquipment] = useState<UserEquipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [weight, setWeight] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push("/login");
            return;
        }

        setUserId(user.id);

        try {
            const userEquipment = await getUserEquipment(user.id);
            setEquipment(userEquipment);
        } catch (error) {
            console.error("Error loading equipment:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!userId || !selectedType) return;

        try {
            const newEquipment = await addUserEquipment(userId, {
                equipment_type: selectedType,
                quantity,
                weight_kg: weight ? parseFloat(weight) : undefined,
            });

            setEquipment([...equipment, newEquipment]);
            setSelectedType("");
            setQuantity(1);
            setWeight("");
        } catch (error) {
            console.error("Error adding equipment:", error);
            alert("Error al agregar equipamiento");
        }
    };

    const handleRemove = async (id: number) => {
        try {
            await removeUserEquipment(id);
            setEquipment(equipment.filter(e => e.id !== id));
        } catch (error) {
            console.error("Error removing equipment:", error);
            alert("Error al eliminar equipamiento");
        }
    };

    const selectedEquipmentInfo = EQUIPMENT_TYPES.find(e => e.value === selectedType);
    const hasEquipment = equipment.length > 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-zinc-900 mb-2">🏋️ Mi Equipamiento</h1>
                    <p className="text-zinc-600 text-lg">
                        Configura qué equipamiento tienes disponible para entrenar
                    </p>
                </div>

                {/* Add Equipment Form */}
                <div className="bg-white/95 backdrop-blur-xl border-2 border-emerald-100 rounded-3xl p-8 shadow-2xl mb-8">
                    <h2 className="text-2xl font-bold text-zinc-900 mb-6">Agregar Equipamiento</h2>

                    <div className="space-y-6">
                        {/* Equipment Type */}
                        <div>
                            <label className="text-sm font-bold text-zinc-700 mb-3 block">
                                Tipo de equipamiento
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {EQUIPMENT_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setSelectedType(type.value)}
                                        disabled={equipment.some(e => e.equipment_type === type.value && !type.hasWeight)}
                                        className={`py-4 px-4 rounded-xl border-2 font-bold transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed ${selectedType === type.value
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                : "border-zinc-200 text-zinc-700 hover:border-emerald-200"
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{type.icon}</div>
                                        <div className="text-sm">{type.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quantity & Weight */}
                        {selectedType && (
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-sm font-bold text-zinc-700 mb-2 block">
                                        Cantidad
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
                                    />
                                </div>

                                {selectedEquipmentInfo?.hasWeight && (
                                    <div className="flex-1">
                                        <label className="text-sm font-bold text-zinc-700 mb-2 block">
                                            Peso (kg) c/u
                                        </label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            placeholder="10"
                                            className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Add Button */}
                        <button
                            onClick={handleAdd}
                            disabled={!selectedType}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Plus className="h-5 w-5" />
                            Agregar
                        </button>
                    </div>
                </div>

                {/* Equipment List */}
                <div className="bg-white/95 backdrop-blur-xl border-2 border-emerald-100 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-zinc-900 mb-6">Tu Equipamiento</h2>

                    {!hasEquipment ? (
                        <div className="text-center py-12">
                            <Dumbbell className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
                            <p className="text-zinc-500 font-medium">
                                Aún no has agregado equipamiento. <br />
                                Agrega lo que tienes disponible arriba.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {equipment.map((item) => {
                                const equipType = EQUIPMENT_TYPES.find(e => e.value === item.equipment_type);
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-4 rounded-xl border-2 border-zinc-200 hover:border-emerald-200 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">{equipType?.icon || "🏋️"}</div>
                                            <div>
                                                <div className="font-bold text-zinc-900">
                                                    {item.equipment_type}
                                                </div>
                                                <div className="text-sm text-zinc-600">
                                                    {item.quantity} {item.quantity === 1 ? "unidad" : "unidades"}
                                                    {item.weight_kg && ` × ${item.weight_kg} kg`}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => item.id && handleRemove(item.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer Actions */}
                    {hasEquipment && (
                        <div className="mt-8 pt-8 border-t-2 border-zinc-100">
                            <button
                                onClick={() => router.push("/dashboard/exercises")}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 text-white font-black text-lg hover:shadow-xl hover:shadow-coral-500/50 transition-all flex items-center justify-center gap-2"
                            >
                                <Check className="h-5 w-5" />
                                Ver Ejercicios Disponibles
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
