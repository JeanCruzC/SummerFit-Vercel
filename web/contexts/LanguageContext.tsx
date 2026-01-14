"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import esCalls from '../messages/es.json';
import enCalls from '../messages/en.json';

type Language = 'es' | 'en';
type Translations = typeof esCalls;

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('es'); // Default to Spanish as requested
    const [translations, setTranslations] = useState<Translations>(esCalls);

    useEffect(() => {
        // Load language from local storage
        const storedLang = localStorage.getItem('summerfit-language') as Language;
        if (storedLang && (storedLang === 'es' || storedLang === 'en')) {
            setLanguage(storedLang);
            setTranslations(storedLang === 'es' ? esCalls : enCalls);
        }
    }, []);

    const changeLanguage = (lang: Language) => {
        setLanguage(lang);
        setTranslations(lang === 'es' ? esCalls : enCalls);
        localStorage.setItem('summerfit-language', lang);
    };

    const t = (path: string) => {
        const keys = path.split('.');
        let current: any = translations;

        for (const key of keys) {
            if (current[key] === undefined) {
                console.warn(`Missing translation for key: ${path}`);
                return path;
            }
            current = current[key];
        }

        return typeof current === 'string' ? current : path;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
