"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, User } from "lucide-react";
import { motion } from "framer-motion";
import { Card, Button, Input, Select, Alert, Switch } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getProfile, upsertProfile } from "@/lib/supabase/database";
import { calculateBMI, getBMICategory, calculateIdealWeightRange } from "@/lib/calculations";
import { DIET_INFO } from "@/lib/diets";
import { UserProfile, DietType } from "@/types";
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('@/components/ui/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400">Cargando mapa...</div>
});

const DIET_OPTIONS: { value: DietType; label: string }[] = [
    { value: "Estándar", label: "Estándar" },
    { value: "Keto", label: "Keto" },
    { value: "Low-Carb", label: "Low-Carb" },
    { value: "Vegana", label: "Vegana" },
    { value: "Vegetariana", label: "Vegetariana" },
    { value: "Paleo", label: "Paleo" },
    { value: "Mediterránea", label: "Mediterránea" },
    { value: "Alta Proteína", label: "Alta Proteína" },
    { value: "Diabéticos", label: "Diabéticos (Bajo Indice Glucémico)" },
];

const ACTIVITY_OPTIONS = [
    { value: "Sedentario", label: "Sedentario (poco o nada de ejercicio)" },
    { value: "Ligero", label: "Ligero (ejercicio 1-3 días/semana)" },
    { value: "Moderado", label: "Moderado (ejercicio 3-5 días/semana)" },
    { value: "Activo", label: "Activo (ejercicio 6-7 días/semana)" },
    { value: "Muy activo", label: "Muy activo (atleta o trabajo físico)" },
];

const GOAL_OPTIONS = [
    { value: "Definir", label: "Definir (perder grasa)" },
    { value: "Mantener", label: "Mantener peso" },
    { value: "Volumen", label: "Volumen (ganar músculo)" },
];

const SPEED_OPTIONS = [
    { value: "conservador", label: "Conservador (lento y seguro)" },
    { value: "moderado", label: "Moderado (balanceado)" },
    { value: "acelerado", label: "Acelerado (rápido, exigente)" },
];

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [profile, setProfile] = useState<UserProfile>({
        user_id: "",
        gender: "M",
        age: 28,
        height_cm: 175,
        weight_kg: 78,
        target_weight_kg: 72,
        goal: "Definir",
        activity_level: "Moderado",
        goal_speed: "moderado",
        diet_type: "Estándar",
        language: "es",
        full_name: "",
        // Social defaults
        phone: "",
        location_name: "",
        is_public_profile: true,
        is_public_routine: true,
        is_public_nutrition: false,
        latitude: 19.4326, // Default CDMX
        longitude: -99.1332
    });

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }

            const data = await getProfile(session.user.id);
            if (data) {
                setProfile(data);
            } else {
                setProfile(p => ({ ...p, user_id: session.user.id }));
            }
            setLoading(false);
        };
        load();
    }, [router]);

    const handleChange = (field: keyof UserProfile, value: any) => {
        setProfile(p => ({ ...p, [field]: value }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const success = await upsertProfile(profile);
        setSaving(false);
        if (success) setSaved(true);
    };

    const bmi = calculateBMI(profile.weight_kg, profile.height_cm);
    const bmiCategory = getBMICategory(bmi);
    const idealRange = calculateIdealWeightRange(profile.height_cm);
    const dietInfo = DIET_INFO[profile.diet_type];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-3xl font-bold">Tu Perfil</h1>
                <p className="text-gray-500 mt-1">Configura tus datos para cálculos personalizados.</p>
            </div>

            {saved && <Alert type="success">✅ Perfil guardado correctamente.</Alert>}

            {/* Basic Info */}
            <Card>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" /> Información básica
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Género"
                        options={[{ value: "M", label: "Masculino" }, { value: "F", label: "Femenino" }]}
                        value={profile.gender}
                        onChange={e => handleChange("gender", e.target.value)}
                    />
                    <Input
                        label="Edad"
                        type="number"
                        min={14}
                        max={100}
                        value={profile.age}
                        onChange={e => handleChange("age", parseInt(e.target.value) || 0)}
                    />
                    <Input
                        label="Altura (cm)"
                        type="number"
                        min={100}
                        max={250}
                        value={profile.height_cm}
                        onChange={e => handleChange("height_cm", parseInt(e.target.value) || 0)}
                    />
                    <Input
                        label="Peso actual (kg)"
                        type="number"
                        min={30}
                        max={300}
                        step={0.1}
                        value={profile.weight_kg}
                        onChange={e => handleChange("weight_kg", parseFloat(e.target.value) || 0)}
                    />
                    <Select
                        label="Idioma / Language"
                        options={[{ value: "es", label: "Español" }, { value: "en", label: "English" }]}
                        value={profile.language || 'es'}
                        onChange={e => handleChange("language", e.target.value)}
                    />
                </div>

                <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Tu IMC actual</span>
                        <span className="text-lg font-semibold">{bmi} <span className="text-sm font-normal text-gray-500">({bmiCategory})</span></span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Peso ideal para tu altura: {idealRange.min} - {idealRange.max} kg
                    </div>
                </div>
            </Card>

            {/* Social & Privacy */}
            <Card>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="text-xl">🌍</span> Comunidad y Privacidad
                </h2>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Teléfono (Opcional)"
                            placeholder="+52 55 1234 5678"
                            type="tel"
                            value={profile.phone || ''}
                            onChange={e => handleChange("phone", e.target.value)}
                        />
                        <Input
                            label="Ciudad / Zona"
                            placeholder="Ej. Condesa, CDMX"
                            value={profile.location_name || ''}
                            onChange={e => handleChange("location_name", e.target.value)}
                        />
                    </div>

                    <LocationPicker
                        latitude={profile.latitude}
                        longitude={profile.longitude}
                        onLocationSelect={(lat, lng) => {
                            handleChange("latitude", lat);
                            handleChange("longitude", lng);
                        }}
                    />

                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Configuración de Privacidad</h3>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Perfil Público</label>
                                <p className="text-xs text-gray-500">Permitir que otros te encuentren y te envíen solicitudes de amistad.</p>
                            </div>
                            <Switch
                                checked={profile.is_public_profile !== false}
                                onCheckedChange={(checked) => handleChange("is_public_profile", checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Compartir Rutina</label>
                                <p className="text-xs text-gray-500">Tus amigos podrán ver tu plan de entrenamiento actual.</p>
                            </div>
                            <Switch
                                checked={profile.is_public_routine !== false}
                                onCheckedChange={(checked) => handleChange("is_public_routine", checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Compartir Comidas</label>
                                <p className="text-xs text-gray-500">Tus amigos podrán ver tus registros de comida (macros).</p>
                            </div>
                            <Switch
                                checked={profile.is_public_nutrition === true}
                                onCheckedChange={(checked) => handleChange("is_public_nutrition", checked)}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Goals */}
            <Card>
                <h2 className="text-lg font-semibold mb-4">🎯 Objetivos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Peso objetivo (kg)"
                        type="number"
                        min={30}
                        max={300}
                        step={0.1}
                        value={profile.target_weight_kg}
                        onChange={e => handleChange("target_weight_kg", parseFloat(e.target.value) || 0)}
                    />
                    <Select
                        label="Tu objetivo"
                        options={GOAL_OPTIONS}
                        value={profile.goal}
                        onChange={e => handleChange("goal", e.target.value)}
                    />
                    <Select
                        label="Velocidad de progreso"
                        options={SPEED_OPTIONS}
                        value={profile.goal_speed || "moderado"}
                        onChange={e => handleChange("goal_speed", e.target.value)}
                    />
                    <Select
                        label="Nivel de actividad"
                        options={ACTIVITY_OPTIONS}
                        value={profile.activity_level}
                        onChange={e => handleChange("activity_level", e.target.value)}
                    />
                    <Select
                        label="Tipo de dieta"
                        options={DIET_OPTIONS}
                        value={profile.diet_type}
                        onChange={e => handleChange("diet_type", e.target.value as DietType)}
                    />
                </div>
            </Card>

            {/* Diet Info */}
            {dietInfo && (
                <Card>
                    <h2 className="text-lg font-semibold mb-2">📋 Dieta: {profile.diet_type}</h2>
                    <p className="text-sm text-gray-500 mb-4">{dietInfo.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">✅ Beneficios</div>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {dietInfo.benefits.map((b, i) => <li key={i}>• {b}</li>)}
                            </ul>
                        </div>
                        {dietInfo.restrictions.length > 0 && (
                            <div>
                                <div className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">⚠️ Evitar</div>
                                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                    {dietInfo.restrictions.map((r, i) => <li key={i}>• {r}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} size="lg" className="w-full md:w-auto">
                <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar perfil"}
            </Button>
        </motion.div>
    );
}
