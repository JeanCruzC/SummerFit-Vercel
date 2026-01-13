"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, ShoppingBasket } from "lucide-react";
import { Card, Button, Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { GROCERY_CATEGORIES, GroceryItem, GroceryCategory } from "@/lib/groceries";

export default function PantrySetupPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string>("");
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState<Record<string, Set<string>>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentCategory = GROCERY_CATEGORIES[currentStep];
    const totalSteps = GROCERY_CATEGORIES.length;
    const progress = ((currentStep + 1) / totalSteps) * 100;

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }
            setUserId(session.user.id);

            // Initialize selections
            const initial: Record<string, Set<string>> = {};
            GROCERY_CATEGORIES.forEach(cat => {
                initial[cat.id] = new Set();
            });
            setSelections(initial);
        };
        checkAuth();
    }, [router]);

    const toggleItem = (categoryId: string, itemName: string) => {
        setSelections(prev => {
            const updated = { ...prev };
            const set = new Set(updated[categoryId]);
            if (set.has(itemName)) {
                set.delete(itemName);
            } else {
                set.add(itemName);
            }
            updated[categoryId] = set;
            return updated;
        });
    };

    const selectAll = (categoryId: string) => {
        const category = GROCERY_CATEGORIES.find(c => c.id === categoryId);
        if (!category) return;

        setSelections(prev => ({
            ...prev,
            [categoryId]: new Set(category.items.map(i => i.name))
        }));
    };

    const currentSelections = selections[currentCategory?.id] || new Set();
    const meetsMinimum = currentCategory ? currentSelections.size >= currentCategory.minRequired : true;
    const canProceed = meetsMinimum;

    const goNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            savePantry();
        }
    };

    const goBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const savePantry = async () => {
        if (!userId) return;
        setSaving(true);
        setError(null);

        try {
            const supabase = createClient();

            // Collect all selected items
            const allItems: Array<{
                user_id: string;
                ingredient_name: string;
                ingredient_name_es: string;
                category: string;
                emoji: string;
                search_term: string;
            }> = [];

            GROCERY_CATEGORIES.forEach(category => {
                const selected = selections[category.id];
                category.items.forEach(item => {
                    if (selected?.has(item.name)) {
                        allItems.push({
                            user_id: userId,
                            ingredient_name: item.searchTerm,
                            ingredient_name_es: item.name,
                            category: category.id,
                            emoji: item.emoji,
                            search_term: item.searchTerm,
                        });
                    }
                });
            });

            // Insert all items
            const { error: insertError } = await supabase
                .from('user_pantry')
                .upsert(allItems, { onConflict: 'user_id,ingredient_name' });

            if (insertError) throw insertError;

            // Mark pantry setup as completed
            await supabase
                .from('profiles')
                .update({ pantry_setup_completed: true })
                .eq('id', userId);

            // Redirect to dashboard
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Error saving pantry');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const getTotalSelected = () => {
        return Object.values(selections).reduce((sum, set) => sum + set.size, 0);
    };

    if (!currentCategory) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
            {/* Progress bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                <div className="flex items-center gap-4 px-4 py-3">
                    <button
                        onClick={goBack}
                        disabled={currentStep === 0}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <span className="text-sm text-gray-500">{currentStep + 1}/{totalSteps}</span>
                </div>
            </div>

            <div className="pt-20 pb-32 px-4 max-w-lg mx-auto">
                {/* Header */}
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-3xl">
                        <ShoppingBasket className="h-8 w-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Selecciona tus alimentos disponibles
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Tu plan depende de tus elecciones
                    </p>
                </motion.div>

                {error && (
                    <Alert type="danger">{error}</Alert>
                )}

                {/* Category Header */}
                <motion.div
                    key={`cat-${currentStep}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between items-center mb-4"
                >
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {currentCategory.nameEs}
                        </h2>
                        {currentCategory.minRequired > 0 && (
                            <p className="text-sm text-gray-500">
                                Elige al menos {currentCategory.minRequired}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => selectAll(currentCategory.id)}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                    >
                        Seleccionar todo
                    </button>
                </motion.div>

                {/* Items Grid */}
                <motion.div
                    key={`items-${currentStep}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap gap-2"
                >
                    {currentCategory.items.map((item, idx) => {
                        const isSelected = currentSelections.has(item.name);
                        return (
                            <motion.button
                                key={item.name}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.02 }}
                                onClick={() => toggleItem(currentCategory.id, item.name)}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
                                    transition-all duration-200 border-2
                                    ${isSelected
                                        ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 text-amber-800 dark:text-amber-200'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-amber-300'
                                    }
                                `}
                            >
                                <span>{item.emoji}</span>
                                <span>{item.name}</span>
                                {isSelected && <Check className="h-4 w-4 text-amber-600" />}
                            </motion.button>
                        );
                    })}
                </motion.div>

                {/* Quick stats for other categories */}
                <div className="mt-8 flex flex-wrap gap-2">
                    {GROCERY_CATEGORIES.map((cat, idx) => {
                        if (idx === currentStep) return null;
                        const count = selections[cat.id]?.size || 0;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setCurrentStep(idx)}
                                className={`px-3 py-1 rounded-full text-xs ${count > 0
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                                    }`}
                            >
                                {cat.nameEs}: {count}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="max-w-lg mx-auto flex flex-col gap-2">
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span>
                            {currentSelections.size} seleccionados
                            {currentCategory.minRequired > 0 && ` (mínimo ${currentCategory.minRequired})`}
                        </span>
                        <span>Total: {getTotalSelected()} ingredientes</span>
                    </div>
                    <Button
                        onClick={goNext}
                        disabled={!canProceed || saving}
                        className="w-full py-4 text-lg"
                    >
                        {saving ? 'Guardando...' : currentStep === totalSteps - 1 ? 'Finalizar' : 'Continuar'}
                        {!saving && <ChevronRight className="ml-2 h-5 w-5" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
