"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, X, Leaf, UtensilsCrossed, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { Card, Button, Input, Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { searchFoods, getFoodCategories, addMealEntry, getProfile, getRandomFoods } from "@/lib/supabase/database";
import { FoodItem, UserProfile } from "@/types";

const CATEGORY_TRANSLATIONS: Record<string, string> = {
    "Dairy and Egg Products": "Lácteos y Huevos",
    "Spices and Herbs": "Especias y Hierbas",
    "Baby Foods": "Bebés",
    "Fats and Oils": "Grasas y Aceites",
    "Poultry Products": "Aves y Pollo",
    "Soups, Sauces, and Gravies": "Sopas y Salsas",
    "Sausages and Luncheon Meats": "Embutidos",
    "Breakfast Cereals": "Cereales",
    "Fruits and Fruit Juices": "Frutas",
    "Pork Products": "Cerdo",
    "Vegetables and Vegetable Products": "Verduras",
    "Nut and Seed Products": "Nueces y Semillas",
    "Beef Products": "Ternera",
    "Beverages": "Bebidas",
    "Finfish and Shellfish Products": "Pescados y Mariscos",
    "Legumes and Legume Products": "Legumbres",
    "Lamb, Veal, and Game Products": "Cordero y Caza",
    "Baked Products": "Horneados / Panadería",
    "Sweets": "Dulces",
    "Cereal Grains and Pasta": "Granos y Pasta",
    "Fast Foods": "Comida Rápida",
    "Meals, Entrees, and Side Dishes": "Platos Preparados",
    "Snacks": "Snacks / Aperitivos",
    "American Indian/Alaska Native Foods": "Comida Nativa Americana",
    "Restaurant Foods": "Restaurante",
};

const translateCategory = (cat: string) => CATEGORY_TRANSLATIONS[cat] || cat;

// Categories that are "basic" ingredients vs prepared dishes
const BASIC_CATEGORIES = [
    "Dairy and Egg Products",
    "Fats and Oils",
    "Poultry Products",
    "Fruits and Fruit Juices",
    "Pork Products",
    "Vegetables and Vegetable Products",
    "Nut and Seed Products",
    "Beef Products",
    "Finfish and Shellfish Products",
    "Legumes and Legume Products",
    "Lamb, Veal, and Game Products",
    "Cereal Grains and Pasta",
    "Spices and Herbs",
    "Beverages",
];

const PREPARED_CATEGORIES = [
    "Fast Foods",
    "Meals, Entrees, and Side Dishes",
    "Restaurant Foods",
    "Soups, Sauces, and Gravies",
    "Snacks",
    "Sweets",
    "Baked Products",
    "Breakfast Cereals",
    "Baby Foods",
    "Sausages and Luncheon Meats",
];

const isBasicFood = (category: string | null | undefined) => BASIC_CATEGORIES.includes(category || "");
const isPreparedFood = (category: string | null | undefined) => PREPARED_CATEGORIES.includes(category || "");

export default function FoodsPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string>("");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [query, setQuery] = useState("");
    const [foods, setFoods] = useState<FoodItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [foodType, setFoodType] = useState<"all" | "basic" | "prepared">("all");
    const [loading, setLoading] = useState(false);
    const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
    const [grams, setGrams] = useState(100);
    const [mealType, setMealType] = useState<"Desayuno" | "Almuerzo" | "Cena" | "Snack">("Almuerzo");
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }
            setUserId(session.user.id);

            const [cats, prof] = await Promise.all([
                getFoodCategories(),
                getProfile(session.user.id),
            ]);
            setCategories(cats);
            setProfile(prof);

            // Load initial popular foods
            const initialFoods = await getRandomFoods(30);
            initialFoods.sort((a, b) => (a.name?.length || 0) - (b.name?.length || 0));
            setFoods(initialFoods);
        };
        load();
    }, [router]);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        const results = await searchFoods(query, 50);

        // Sort by length to prioritize basics (e.g. "Arroz" < "Snacks de Arroz...")
        // And push "Restaurant" or "Snacks" to the bottom if needed?
        // Length sort is usually sufficient for "Basics first"
        results.sort((a, b) => {
            // Priority check: Put "Raw" or simple categories first if possible?
            // For now, Length is the best heuristic.
            return a.name.length - b.name.length;
        });

        setFoods(results);
        setLoading(false);
    };

    const handleAddToDay = async () => {
        if (!selectedFood || !userId) return;
        setAdding(true);

        const multiplier = grams / 100;
        const entry = {
            user_id: userId,
            log_date: new Date().toISOString().split("T")[0],
            meal_type: mealType,
            food_name: selectedFood.name,
            grams,
            calories: Math.round((selectedFood.kcal_per_100g || 0) * multiplier),
            protein_g: Math.round((selectedFood.protein_g_per_100g || 0) * multiplier * 10) / 10,
            carbs_g: Math.round((selectedFood.carbs_g_per_100g || 0) * multiplier * 10) / 10,
            fat_g: Math.round((selectedFood.fat_g_per_100g || 0) * multiplier * 10) / 10,
        };

        const success = await addMealEntry(entry);
        setAdding(false);
        if (success) {
            setAdded(true);
            setTimeout(() => setAdded(false), 3000);
            setSelectedFood(null);
        }
    };

    const calcNutrients = (food: FoodItem, g: number) => {
        const m = g / 100;
        return {
            kcal: Math.round((food.kcal_per_100g || 0) * m),
            protein: Math.round((food.protein_g_per_100g || 0) * m * 10) / 10,
            carbs: Math.round((food.carbs_g_per_100g || 0) * m * 10) / 10,
            fat: Math.round((food.fat_g_per_100g || 0) * m * 10) / 10,
        };
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Buscar Alimentos</h1>
                <p className="text-gray-500 mt-1">Base de datos con más de 14,000 alimentos.</p>
            </div>

            {added && <Alert type="success">✅ Alimento agregado a tu registro.</Alert>}

            {/* Search */}
            <Card>
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar alimento (ej: pollo, arroz, manzana...)"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSearch()}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? "Buscando..." : "Buscar"}
                    </Button>
                </div>

                {/* Food Type Filter (Básicos vs Preparados) */}
                <div className="mt-4 flex gap-2">
                    <button
                        onClick={() => setFoodType("all")}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${foodType === "all" ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Todos
                    </button>
                    <button
                        onClick={() => setFoodType("basic")}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${foodType === "basic" ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                    >
                        <Leaf className="h-4 w-4" />
                        Básicos
                    </button>
                    <button
                        onClick={() => setFoodType("prepared")}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${foodType === "prepared" ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                    >
                        <UtensilsCrossed className="h-4 w-4" />
                        Preparados
                    </button>
                </div>

                {/* Category filter */}
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory("")}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${!selectedCategory ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"}`}
                    >
                        Todas categorías
                    </button>
                    {categories
                        .filter(cat => {
                            if (foodType === "basic") return isBasicFood(cat);
                            if (foodType === "prepared") return isPreparedFood(cat);
                            return true;
                        })
                        .slice(0, 8).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedCategory === cat ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"}`}
                            >
                                {translateCategory(cat)}
                            </button>
                        ))}
                </div>
            </Card>

            {/* Results */}
            {foods.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">{foods.length} resultados</h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {foods
                            .filter(f => {
                                // Apply category filter
                                if (selectedCategory && f.category !== selectedCategory) return false;
                                // Apply food type filter
                                if (foodType === "basic" && !isBasicFood(f.category)) return false;
                                if (foodType === "prepared" && !isPreparedFood(f.category)) return false;
                                return true;
                            })
                            .map(food => {
                                const n = calcNutrients(food, 100);
                                return (
                                    <div
                                        key={food.id}
                                        onClick={() => setSelectedFood(food)}
                                        className={`p-3 rounded-xl border cursor-pointer transition ${selectedFood?.id === food.id ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{food.name}</div>
                                                <div className="text-xs text-gray-500">{translateCategory(food.category || "")}</div>
                                            </div>
                                            <div className="text-right text-sm">
                                                <div className="font-semibold text-purple-600">{n.kcal} kcal</div>
                                                <div className="text-xs text-gray-500">por 100g</div>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex gap-4 text-xs text-gray-500">
                                            <span>🥩 {n.protein}g P</span>
                                            <span>🍞 {n.carbs}g C</span>
                                            <span>🥑 {n.fat}g G</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </Card>
            )}

            {/* Selected Food Modal */}
            {selectedFood && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <Card className="max-w-md w-full relative">
                        <button
                            onClick={() => setSelectedFood(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 className="text-xl font-semibold pr-8">{selectedFood.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{translateCategory(selectedFood.category || "")}</p>

                        <div className="mt-4">
                            <Input
                                label="Cantidad (gramos)"
                                type="number"
                                min={1}
                                value={grams}
                                onChange={e => setGrams(parseInt(e.target.value) || 100)}
                            />
                        </div>

                        {/* Calculated nutrients */}
                        {(() => {
                            const n = calcNutrients(selectedFood, grams);
                            return (
                                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                        <div className="text-xl font-bold text-purple-600">{n.kcal}</div>
                                        <div className="text-xs text-gray-500">kcal</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                                        <div className="text-xl font-bold">{n.protein}</div>
                                        <div className="text-xs text-gray-500">Proteína</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                                        <div className="text-xl font-bold">{n.carbs}</div>
                                        <div className="text-xs text-gray-500">Carbos</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                                        <div className="text-xl font-bold">{n.fat}</div>
                                        <div className="text-xs text-gray-500">Grasas</div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="mt-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Comida</label>
                            <div className="flex gap-2">
                                {(["Desayuno", "Almuerzo", "Cena", "Snack"] as const).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setMealType(m)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mealType === m ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600"}`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button onClick={handleAddToDay} disabled={adding} className="w-full mt-6">
                            <Plus className="h-4 w-4" /> {adding ? "Agregando..." : "Agregar a mi día"}
                        </Button>
                    </Card>
                </div>
            )}
        </motion.div>
    );
}
