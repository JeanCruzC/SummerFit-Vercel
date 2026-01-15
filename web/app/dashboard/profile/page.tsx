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
import { useLanguage } from "@/lib/i18n/context";
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('@/components/ui/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400">Cargando mapa...</div>
});

import SuccessOverlay from "@/components/ui/SuccessOverlay";
import AvatarUpload from "@/components/ui/AvatarUpload";



export default function ProfilePage() {
    const router = useRouter();
    const { t, lang } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
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
                setInitialWeight(data.weight_kg);
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

    // Keep track of initial weight to detect changes
    const [initialWeight, setInitialWeight] = useState<number | null>(null);

    const handleSave = async () => {
        setSaving(true);
        const success = await upsertProfile(profile);

        if (success) {
            setSaved(true);
            setShowSuccess(true);

            // Check for Weight Loss Trigger
            if (initialWeight && profile.weight_kg < initialWeight) {
                const lostAmount = initialWeight - profile.weight_kg;
                const isGoalReached = profile.weight_kg <= profile.target_weight_kg && initialWeight > profile.target_weight_kg;

                // Only post if significant change (> 0.5kg) or goal reached
                if (lostAmount >= 0.5 || isGoalReached) {
                    try {
                        const supabase = createClient();
                        await supabase.from("activity_feed").insert({
                            user_id: profile.user_id,
                            type: 'weight_goal',
                            content: isGoalReached
                                ? (lang === 'en' ? `Goal Reached! 🎉 I've hit my target of ${profile.weight_kg}kg.` : `¡Objetivo Alcanzado! 🎉 He llegado a mi meta de ${profile.weight_kg}kg.`)
                                : (lang === 'en' ? `Progress! 🔥 I've lost ${lostAmount.toFixed(1)}kg.` : `¡Progreso! 🔥 He bajado ${lostAmount.toFixed(1)}kg.`),
                            metadata: {
                                initial_weight: initialWeight,
                                new_weight: profile.weight_kg,
                                lost_amount: lostAmount
                            }
                        });
                        // Update initial weight so we don't trigger again until next drop
                        setInitialWeight(profile.weight_kg);
                    } catch (err) {
                        console.error("Error creating feed post:", err);
                    }
                }
            }

            setTimeout(() => setShowSuccess(false), 2500); // 2.5s animation
        }
        setSaving(false);
    };

    const bmi = calculateBMI(profile.weight_kg, profile.height_cm);
    const bmiCategory = getBMICategory(bmi);
    const idealRange = calculateIdealWeightRange(profile.height_cm);
    const dietInfo = DIET_INFO[profile.diet_type];

    // Define options dynamically with translations
    const dietOptions: { value: DietType; label: string }[] = [
        { value: "Estándar", label: t('profile.diets.standard') },
        { value: "Keto", label: t('profile.diets.keto') },
        { value: "Low-Carb", label: t('profile.diets.lowcarb') },
        { value: "Vegana", label: t('profile.diets.vegan') },
        { value: "Vegetariana", label: t('profile.diets.vegetarian') },
        { value: "Paleo", label: t('profile.diets.paleo') },
        { value: "Mediterránea", label: t('profile.diets.mediterranean') },
        { value: "Alta Proteína", label: t('profile.diets.highprotein') },
        { value: "Diabéticos", label: t('profile.diets.diabetic') },
    ];

    const activityOptions = [
        { value: "Sedentario", label: t('profile.activities.sedentary') },
        { value: "Ligero", label: t('profile.activities.light') },
        { value: "Moderado", label: t('profile.activities.moderate') },
        { value: "Activo", label: t('profile.activities.active') },
        { value: "Muy activo", label: t('profile.activities.veryActive') },
    ];

    const goalOptions = [
        { value: "Definir", label: t('profile.goals.cut') },
        { value: "Mantener", label: t('profile.goals.maintain') },
        { value: "Volumen", label: t('profile.goals.bulk') },
    ];

    const speedOptions = [
        { value: "conservador", label: t('profile.speeds.conservative') },
        { value: "moderado", label: t('profile.speeds.moderate') },
        { value: "acelerado", label: t('profile.speeds.accelerated') },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
                <AvatarUpload
                    userId={profile.user_id}
                    url={profile.avatar_url}
                    onUpload={(url) => handleChange("avatar_url", url)}
                />
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
                    <p className="text-gray-500 mt-1">{lang === 'es' ? 'Configura tus datos para cálculos personalizados.' : 'Configure your data for personalized calculations.'}</p>
                </div>
            </div>

            <SuccessOverlay isVisible={showSuccess} message={t('profile.saved')} />

            {saved && !showSuccess && <Alert type="success">✅ {t('profile.updated')}</Alert>}

            {/* Basic Info */}
            <Card>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" /> {t('profile.basicInfo')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label={t('profile.gender')}
                        options={[{ value: "M", label: t('profile.male') }, { value: "F", label: t('profile.female') }]}
                        value={profile.gender}
                        onChange={e => handleChange("gender", e.target.value)}
                    />

                    <Select
                        label={t('profile.lifestage')}
                        options={[
                            { value: "standard", label: t('profile.lifestages.standard') },
                            { value: "pregnancy_1", label: t('profile.lifestages.pregnancy_1') },
                            { value: "pregnancy_2", label: t('profile.lifestages.pregnancy_2') },
                            { value: "pregnancy_3", label: t('profile.lifestages.pregnancy_3') },
                            { value: "lactation_1", label: t('profile.lifestages.lactation_1') },
                            { value: "lactation_2", label: t('profile.lifestages.lactation_2') },
                            { value: "menopause", label: t('profile.lifestages.menopause') },
                            { value: "senior", label: t('profile.lifestages.senior') },
                        ]}
                        value={profile.life_stage || 'standard'}
                        onChange={e => handleChange("life_stage", e.target.value)}
                    />

                    <Input
                        label={t('profile.age')}
                        type="number"
                        min={14}
                        max={100}
                        value={profile.age}
                        onChange={e => handleChange("age", parseInt(e.target.value) || 0)}
                    />
                    <Input
                        label={t('profile.height')}
                        type="number"
                        min={100}
                        max={250}
                        value={profile.height_cm}
                        onChange={e => handleChange("height_cm", parseInt(e.target.value) || 0)}
                    />
                    <Input
                        label={t('profile.weight')}
                        type="number"
                        min={30}
                        max={300}
                        step={0.1}
                        value={profile.weight_kg}
                        onChange={e => handleChange("weight_kg", parseFloat(e.target.value) || 0)}
                    />
                    <Select
                        label={t('profile.language')}
                        options={[{ value: "es", label: t('profile.spanish') }, { value: "en", label: t('profile.english') }]}
                        value={profile.language || 'es'}
                        onChange={e => handleChange("language", e.target.value)}
                    />
                </div>

                <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{t('profile.currentBMI')}</span>
                        <span className="text-lg font-semibold">{bmi} <span className="text-sm font-normal text-gray-500">({bmiCategory})</span></span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        {t('profile.idealWeight')}: {idealRange.min} - {idealRange.max} kg
                    </div>
                </div>
            </Card>

            {/* Social & Privacy */}
            <Card>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="text-xl">🌍</span> {t('profile.communityPrivacy')}
                </h2>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label={t('profile.phone')}
                            placeholder="+52 55 1234 5678"
                            type="tel"
                            value={profile.phone || ''}
                            onChange={e => handleChange("phone", e.target.value)}
                        />
                        <Input
                            label={t('profile.city')}
                            placeholder="Ej. Condesa, CDMX"
                            value={profile.location_name || ''}
                            onChange={e => handleChange("location_name", e.target.value)}
                        />
                    </div>

                    <LocationPicker
                        latitude={profile.latitude}
                        longitude={profile.longitude}
                        onLocationSelect={(lat: number, lng: number, address?: string) => {
                            handleChange("latitude", lat);
                            handleChange("longitude", lng);
                            if (address) handleChange("location_name", address);
                        }}
                    />

                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('nav.settings')}</h3>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.publicProfile')}</label>
                                <p className="text-xs text-gray-500">{t('profile.publicProfileDesc')}</p>
                            </div>
                            <Switch
                                checked={profile.is_public_profile !== false}
                                onCheckedChange={(checked) => handleChange("is_public_profile", checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.shareRoutine')}</label>
                                <p className="text-xs text-gray-500">{t('profile.shareRoutineDesc')}</p>
                            </div>
                            <Switch
                                checked={profile.is_public_routine !== false}
                                onCheckedChange={(checked) => handleChange("is_public_routine", checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.shareMeals')}</label>
                                <p className="text-xs text-gray-500">{t('profile.shareMealsDesc')}</p>
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
                <h2 className="text-lg font-semibold mb-4">🎯 {t('dashboard.goals')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label={t('profile.targetWeight')}
                        type="number"
                        min={30}
                        max={300}
                        step={0.1}
                        value={profile.target_weight_kg}
                        onChange={e => handleChange("target_weight_kg", parseFloat(e.target.value) || 0)}
                    />
                    <Select
                        label={t('profile.yourGoal')}
                        options={goalOptions}
                        value={profile.goal}
                        onChange={e => handleChange("goal", e.target.value)}
                    />
                    <Select
                        label={t('profile.speed')}
                        options={speedOptions}
                        value={profile.goal_speed || "moderado"}
                        onChange={e => handleChange("goal_speed", e.target.value)}
                    />
                    <Select
                        label={t('profile.activityLevel')}
                        options={activityOptions}
                        value={profile.activity_level}
                        onChange={e => handleChange("activity_level", e.target.value)}
                    />
                    <Select
                        label={t('profile.diet')}
                        options={dietOptions}
                        value={profile.diet_type}
                        onChange={e => handleChange("diet_type", e.target.value as DietType)}
                    />
                </div>
            </Card>

            {/* Diet Info */}
            {dietInfo && (
                <Card>
                    <h2 className="text-lg font-semibold mb-2">📋 {t('profile.diet')}: {profile.diet_type}</h2>
                    <p className="text-sm text-gray-500 mb-4">{dietInfo.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">✅ {t('profile.benefits')}</div>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {dietInfo.benefits.map((b, i) => <li key={i}>• {b}</li>)}
                            </ul>
                        </div>
                        {dietInfo.restrictions.length > 0 && (
                            <div>
                                <div className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">⚠️ {t('profile.avoid')}</div>
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
                <Save className="h-4 w-4" /> {saving ? t('profile.saving') : t('profile.save')}
            </Button>
        </motion.div>
    );
}
