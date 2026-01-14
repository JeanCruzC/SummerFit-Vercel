'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

// Translation dictionaries
import es from '@/messages/es.json';
import en from '@/messages/en.json';

type Language = 'es' | 'en';
type TranslationDict = typeof es;

interface LanguageContextType {
    lang: Language;
    setLang: (lang: Language) => Promise<void>;
    t: (key: string) => string;
    // For database fields
    getText: (esText: string | null | undefined, enText: string | null | undefined) => string;
}

const translations: Record<Language, TranslationDict> = { es, en };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Language>('es');
    const [userId, setUserId] = useState<string | null>(null);

    // Load user's language preference on mount
    useEffect(() => {
        const loadLanguage = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                setUserId(user.id);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('language')
                    .eq('user_id', user.id)
                    .single();

                if (profile?.language) {
                    setLangState(profile.language as Language);
                }
            }
        };
        loadLanguage();
    }, []);

    // Set language and save to profile
    const setLang = async (newLang: Language) => {
        setLangState(newLang);

        if (userId) {
            const supabase = createClient();
            await supabase
                .from('profiles')
                .update({ language: newLang })
                .eq('user_id', userId);
        }
    };

    // Translation function for static text
    const t = (key: string): string => {
        const keys = key.split('.');
        let value: any = translations[lang];

        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) {
                console.warn(`Translation missing: ${key} for ${lang}`);
                return key;
            }
        }

        return value as string;
    };

    // Helper for database fields (returns ES or EN based on current language)
    const getText = (esText: string | null | undefined, enText: string | null | undefined): string => {
        if (lang === 'es') {
            return esText || enText || '';
        }
        return enText || esText || '';
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t, getText }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Muscle group translations (for exercise data)
export const muscleTranslations: Record<string, string> = {
    'Chest': 'Pecho',
    'Back': 'Espalda',
    'Shoulders': 'Hombros',
    'Biceps': 'Bíceps',
    'Triceps': 'Tríceps',
    'Forearms': 'Antebrazos',
    'Abs': 'Abdominales',
    'Core': 'Core',
    'Quads': 'Cuádriceps',
    'Hamstrings': 'Isquiotibiales',
    'Glutes': 'Glúteos',
    'Calves': 'Pantorrillas',
    'Lats': 'Dorsales',
    'Traps': 'Trapecio',
    'Posterior Deltoid': 'Deltoides Posterior',
    'Rear Shoulders': 'Hombros Traseros',
    'Lower Back': 'Espalda Baja',
    'Hip Flexors': 'Flexores de Cadera',
    'Obliques': 'Oblicuos'
};

export function translateMuscle(muscle: string, lang: Language): string {
    if (lang === 'es') {
        return muscleTranslations[muscle] || muscle;
    }
    // For English, find reverse mapping
    const enMuscle = Object.entries(muscleTranslations).find(([_, es]) => es === muscle);
    return enMuscle ? enMuscle[0] : muscle;
}
