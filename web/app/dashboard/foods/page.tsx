"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, X, ChefHat, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { Card, Button, Input, Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";
import { searchFoods, getFoodCategories, addMealEntry, getProfile, getRandomFoods } from "@/lib/supabase/database";
import { FoodItem, UserProfile } from "@/types";

// Cooking state filter options with colors
const COOKING_STATES = [
    { value: "", label: "All States", label_es: "Todos", icon: "🍽️", color: "gray" },
    { value: "raw", label: "Raw", label_es: "Crudo", icon: "🥩", color: "red" },
    { value: "cooked", label: "Cooked", label_es: "Cocido", icon: "🍳", color: "green" },
    { value: "frozen", label: "Frozen", label_es: "Congelado", icon: "🧊", color: "blue" },
    { value: "canned", label: "Canned", label_es: "Enlatado", icon: "🥫", color: "amber" },
    { value: "dried", label: "Dried", label_es: "Seco", icon: "🌾", color: "yellow" },
    { value: "roasted", label: "Roasted", label_es: "Asado", icon: "🔥", color: "orange" },
];

// Color classes for cooking state badges
const getCookingStateColor = (state: string | undefined): string => {
    const colors: Record<string, string> = {
        raw: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
        cooked: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
        frozen: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
        canned: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
        dried: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
        roasted: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
        boiled: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
        fried: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
        grilled: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
        baked: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
        steamed: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
    };
    return colors[state || ""] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400";
};

// Top food bases for quick filter with translations
const TOP_FOOD_BASES = [
    { en: "Beef", es: "Res" },
    { en: "Chicken", es: "Pollo" },
    { en: "Pork", es: "Cerdo" },
    { en: "Fish", es: "Pescado" },
    { en: "Turkey", es: "Pavo" },
    { en: "Lamb", es: "Cordero" },
    { en: "Beans", es: "Frijoles" },
    { en: "Rice", es: "Arroz" },
    { en: "Potatoes", es: "Papas" },
    { en: "Cheese", es: "Queso" },
    { en: "Milk", es: "Leche" },
    { en: "Eggs", es: "Huevos" },
];

// Category translations
const CATEGORY_TRANSLATIONS: Record<string, string> = {
    'American Indian/Alaska Native Foods': 'Alimentos Indígenas Americanos',
    'Baked Products': 'Productos de Panadería',
    'Beef Products': 'Productos de Res',
    'Cereal Grains and Pasta': 'Cereales y Pastas',
    'Dairy and Egg Products': 'Lácteos y Huevos',
    'Finfish and Shellfish Products': 'Pescados y Mariscos',
    'Fruits and Fruit Juices': 'Frutas y Jugos',
    'Lamb, Veal, and Game Products': 'Cordero, Ternera y Caza',
    'Legumes and Legume Products': 'Legumbres',
    'Nut and Seed Products': 'Frutos Secos y Semillas',
    'Pork Products': 'Productos de Cerdo',
    'Poultry Products': 'Aves de Corral',
    'Restaurant Foods': 'Comida de Restaurante',
    'Sausages and Luncheon Meats': 'Embutidos y Carnes Frías',
    'Vegetables and Vegetable Products': 'Verduras y Vegetales',
    'Sweets': 'Dulces y Postres',
    'Fast Foods': 'Comida Rápida',
    'Meals, Entrees, and Side Dishes': 'Platos Preparados',
    'Fats and Oils': 'Grasas y Aceites',
    'Beverages': 'Bebidas',
    'Spices and Herbs': 'Especias y Hierbas',
    'Snacks': 'Snacks y Botanas',
    'Soups, Sauces, and Gravies': 'Sopas, Salsas y Aderezos',
    'Baby Foods': 'Alimentos para Bebés',
    'Breakfast Cereals': 'Cereales de Desayuno'
};

const TRANSLATIONS = {
    en: {
        title: "Food Search",
        subtitle: "USDA Database with 8,000+ foods.",
        searchPlaceholder: "Search food (e.g: chicken, rice, apple...)",
        searching: "Searching...",
        search: "Search",
        cookingState: "Cooking State",
        foodType: "Food Type",
        allTypes: "All Types",
        category: "Category",
        clearFilters: "Clear all filters",
        allCategories: "All Categories",
        results: "results",
        filteredBy: "Filtered by:",
        noResults: "No foods match your filters.",
        clear: "Clear filters",
        amount: "Amount (grams)",
        addToDay: "Add to my day",
        adding: "Adding...",
        added: "✅ Food added to your log.",
        nutritionDetails: "Nutrition Details",
        minerals: "Minerals",
        vitamins: "Vitamins",
        meal: "Meal"
    },
    es: {
        title: "Buscador de Alimentos",
        subtitle: "Base de datos USDA con 8,000+ alimentos.",
        searchPlaceholder: "Buscar alimento (ej: pollo, arroz, manzana...)",
        searching: "Buscando...",
        search: "Buscar",
        cookingState: "Estado de Cocción",
        foodType: "Tipo de Alimento",
        allTypes: "Todos",
        category: "Categoría",
        clearFilters: "Borrar filtros",
        allCategories: "Todas",
        results: "resultados",
        filteredBy: "Filtrado por:",
        noResults: "No se encontraron alimentos.",
        clear: "Limpiar filtros",
        amount: "Cantidad (gramos)",
        addToDay: "Añadir al día",
        adding: "Añadiendo...",
        added: "✅ Alimento añadido.",
        nutritionDetails: "Detalles Nutricionales",
        minerals: "Minerales",
        vitamins: "Vitaminas",
        meal: "Comida"
    }
};

export default function FoodsPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string>("");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [query, setQuery] = useState("");
    const [foods, setFoods] = useState<FoodItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedCookingState, setSelectedCookingState] = useState<string>("");
    const [selectedFoodBase, setSelectedFoodBase] = useState<string>("");
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

            // Load initial random foods
            const initialFoods = await getRandomFoods(30);
            initialFoods.sort((a, b) => (a.name?.length || 0) - (b.name?.length || 0));
            setFoods(initialFoods);
        };
        load();
    }, [router]);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        const results = await searchFoods(query, 100);
        results.sort((a, b) => a.name.length - b.name.length);
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

    // Filter foods by all criteria
    const filteredFoods = foods.filter(f => {
        if (selectedCategory && f.category !== selectedCategory) return false;
        if (selectedCookingState && f.cooking_state !== selectedCookingState) return false;
        if (selectedFoodBase && f.food_base?.toLowerCase() !== selectedFoodBase.toLowerCase()) return false;
        return true;
    });

    const clearFilters = () => {
        setSelectedCategory("");
        setSelectedCookingState("");
        setSelectedFoodBase("");
    };

    const hasActiveFilters = selectedCategory || selectedCookingState || selectedFoodBase;
    const { lang: globalLang } = useLanguage();
    const lang = globalLang; // Use global language context
    const t = TRANSLATIONS[lang];

    // Helper to get translated category
    const getCategoryName = (cat: string) => {
        if (lang === 'es') {
            return CATEGORY_TRANSLATIONS[cat] || cat;
        }
        return cat;
    };

    const getFoodName = (f: FoodItem) => {
        if (lang === 'es' && f.name_es) return f.name_es;
        return f.display_name || f.name;
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{t.title}</h1>
                <p className="text-gray-500 mt-1">{t.subtitle}</p>
            </div>

            {added && <Alert type="success">{t.added}</Alert>}

            {/* Search */}
            <Card>
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSearch()}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? t.searching : t.search}
                    </Button>
                </div>

                {/* Cooking State Filter */}
                <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ChefHat className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.cookingState}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {COOKING_STATES.map(state => (
                            <button
                                key={state.value}
                                onClick={() => setSelectedCookingState(state.value)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${selectedCookingState === state.value
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                                    }`}
                            >
                                <span>{state.icon}</span>
                                {lang === 'es' ? state.label_es : state.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Food Base Filter */}
                <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Flame className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.foodType}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedFoodBase("")}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${!selectedFoodBase ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                                }`}
                        >
                            {t.allTypes}
                        </button>
                        {TOP_FOOD_BASES.map(base => (
                            <button
                                key={base.en}
                                onClick={() => setSelectedFoodBase(base.en)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedFoodBase === base.en
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                                    }`}
                            >
                                {lang === 'es' ? base.es : base.en}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category filter - Dynamic from DB */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.category}</span>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="text-xs text-purple-600 hover:underline">
                                {t.clearFilters}
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory("")}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${!selectedCategory ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"}`}
                        >
                            {t.allCategories}
                        </button>
                        {categories.slice(0, 10).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedCategory === cat ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"}`}
                            >
                                {getCategoryName(cat)}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Results */}
            {filteredFoods.length > 0 && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">{filteredFoods.length} results</h3>
                        {hasActiveFilters && (
                            <span className="text-sm text-gray-500">
                                Filtered by:
                                {selectedCookingState && ` ${selectedCookingState}`}
                                {selectedFoodBase && ` • ${selectedFoodBase}`}
                                {selectedCategory && ` • ${selectedCategory}`}
                            </span>
                        )}
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {filteredFoods.map(food => {
                            const n = calcNutrients(food, 100);
                            return (
                                <div
                                    key={food.id}
                                    onClick={() => setSelectedFood(food)}
                                    className={`p-3 rounded-xl border cursor-pointer transition ${selectedFood?.id === food.id ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 dark:text-white truncate">{getFoodName(food)}</div>
                                            <div className="flex flex-wrap gap-1.5 text-xs mt-1">
                                                {food.cooking_state && <span className={`${getCookingStateColor(food.cooking_state)} px-1.5 py-0.5 rounded font-medium`}>{food.cooking_state}</span>}
                                                {food.category && <span className="text-gray-500">{food.category}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right text-sm ml-2">
                                            <div className="font-semibold text-purple-600">{n.kcal} kcal</div>
                                            <div className="text-xs text-gray-500">per 100g</div>
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

            {/* No results */}
            {filteredFoods.length === 0 && foods.length > 0 && (
                <Card>
                    <div className="text-center py-8 text-gray-500">
                        <p>No foods match your filters.</p>
                        <button onClick={clearFilters} className="text-purple-600 hover:underline mt-2">
                            Clear filters
                        </button>
                    </div>
                </Card>
            )}

            {/* Selected Food Modal */}
            {selectedFood && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                    <Card className="max-w-lg w-full relative my-8 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedFood(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 className="text-xl font-semibold pr-8">{getFoodName(selectedFood)}</h3>
                        {selectedFood.display_name && selectedFood.display_name !== selectedFood.name && (
                            <p className="text-xs text-gray-400 mt-0.5 pr-8">{selectedFood.name}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedFood.cooking_state && <span className={`text-xs ${getCookingStateColor(selectedFood.cooking_state)} px-2 py-1 rounded-full font-medium`}>{selectedFood.cooking_state}</span>}
                            {selectedFood.category && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">{selectedFood.category}</span>}
                        </div>

                        <div className="mt-4">
                            <Input
                                label={t.amount}
                                type="number"
                                min={1}
                                value={grams}
                                onChange={e => setGrams(parseInt(e.target.value) || 100)}
                            />
                        </div>

                        {/* Main Macros */}
                        {(() => {
                            const m = grams / 100;
                            const n = {
                                kcal: Math.round((selectedFood.kcal_per_100g || 0) * m),
                                protein: Math.round((selectedFood.protein_g_per_100g || 0) * m * 10) / 10,
                                carbs: Math.round((selectedFood.carbs_g_per_100g || 0) * m * 10) / 10,
                                fat: Math.round((selectedFood.fat_g_per_100g || 0) * m * 10) / 10,
                                fiber: Math.round((selectedFood.fiber_g_per_100g || 0) * m * 10) / 10,
                                sugar: Math.round((selectedFood.sugar_g_per_100g || 0) * m * 10) / 10,
                                saturatedFat: Math.round((selectedFood.saturated_fat_g_per_100g || 0) * m * 10) / 10,
                                sodium: Math.round((selectedFood.sodium_mg_per_100g || 0) * m),
                                cholesterol: Math.round((selectedFood.cholesterol_mg_per_100g || 0) * m),
                                potassium: Math.round((selectedFood.potassium_mg_per_100g || 0) * m),
                                calcium: Math.round((selectedFood.calcium_mg_per_100g || 0) * m),
                                iron: Math.round((selectedFood.iron_mg_per_100g || 0) * m * 10) / 10,
                                vitaminA: Math.round((selectedFood.vitamin_a_iu_per_100g || 0) * m),
                                vitaminC: Math.round((selectedFood.vitamin_c_mg_per_100g || 0) * m * 10) / 10,
                                vitaminD: Math.round((selectedFood.vitamin_d_iu_per_100g || 0) * m),
                            };
                            return (
                                <div className="mt-4 space-y-4">
                                    {/* Main macros */}
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                            <div className="text-xl font-bold text-purple-600">{n.kcal}</div>
                                            <div className="text-xs text-gray-500">kcal</div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                                            <div className="text-xl font-bold text-red-600">{n.protein}g</div>
                                            <div className="text-xs text-gray-500">Protein</div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                                            <div className="text-xl font-bold text-amber-600">{n.carbs}g</div>
                                            <div className="text-xs text-gray-500">Carbs</div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                                            <div className="text-xl font-bold text-green-600">{n.fat}g</div>
                                            <div className="text-xs text-gray-500">Fat</div>
                                        </div>
                                    </div>

                                    {/* Detailed nutrition */}
                                    <div className="border-t pt-3 dark:border-gray-700">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.nutritionDetails}</h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-500">Fiber</span><span className="font-medium">{n.fiber}g</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Sugar</span><span className="font-medium">{n.sugar}g</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Sat. Fat</span><span className="font-medium">{n.saturatedFat}g</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Cholesterol</span><span className="font-medium">{n.cholesterol}mg</span></div>
                                        </div>
                                    </div>

                                    {/* Minerals */}
                                    <div className="border-t pt-3 dark:border-gray-700">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.minerals}</h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-500">Sodium</span><span className="font-medium">{n.sodium}mg</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Potassium</span><span className="font-medium">{n.potassium}mg</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Calcium</span><span className="font-medium">{n.calcium}mg</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Iron</span><span className="font-medium">{n.iron}mg</span></div>
                                        </div>
                                    </div>

                                    {/* Vitamins */}
                                    <div className="border-t pt-3 dark:border-gray-700">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.vitamins}</h4>
                                        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-500">Vit. A</span><span className="font-medium">{n.vitaminA} IU</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Vit. C</span><span className="font-medium">{n.vitaminC}mg</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Vit. D</span><span className="font-medium">{n.vitaminD} IU</span></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="mt-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">{t.meal}</label>
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
                            <Plus className="h-4 w-4" /> {adding ? t.adding : t.addToDay}
                        </Button>
                    </Card>
                </div>
            )
            }
        </motion.div >
    );
}
