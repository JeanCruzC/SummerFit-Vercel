// Grocery categories for pantry selection
// Generated from USDA database analysis

export interface GroceryItem {
    name: string;      // Spanish name for UI
    searchTerm: string; // English term for USDA search
    emoji: string;
    foodId?: string;   // food_id from Supabase onboarding whitelist
}

export interface GroceryCategory {
    id: string;
    name: string;
    nameEs: string;
    minRequired: number;
    items: GroceryItem[];
}

const GROCERY_ID_MAP: Record<string, string> = {
    // Proteins
    'Pollo': '28346', 'Carne': '28237', 'Chancho': '28277', 'Pescado': '28639', 'Atún': '28726',
    'Langostinos': '28775', 'Pavo': '28519', 'Huevo': '29568', 'Jamón': '28293', 'Tofu': '29891',
    'Carne de Soya': '29866', 'Tempeh': '33238', 'Seitán': '33239', 'Proteína en polvo': '33146',
    // Carbs / Legumes
    'Arroz': '30817', 'Papa': '29844', 'Camote': '32117', 'Pasta': '30766', 'Pan': '30013', 'Avena': '30796',
    'Quinua': '30815', 'Choclo': '32198', 'Tortilla': '30237', 'Cereal': '30497', 'Yuca': '31979',
    'Lentejas': '29840', 'Frijoles': '29776', 'Garbanzos': '29831', 'Arvejas': '32374', 'Popcorn': '30580',
    // Fats / nuts / seeds
    'Palta': '31638', 'Maní': '29934', 'Mantequilla de Maní': '29952', 'Almendras': '29904',
    'Nueces': '29946', 'Cashews': '29908', 'Aceitunas': '32504', 'Aceite de Oliva': '27881',
    'Coco': '27881', 'Chía': '30005', 'Linaza': '30005', 'Pecanas': '29939', 'Pistachos': '29908',
    'Chocolate': '27881', 'Cacao en Polvo': '28002',
    // Vegetables
    'Lechuga': '32204', 'Tomate': '32134', 'Brócoli': '32058', 'Zanahoria': '32075', 'Espinaca': '32029',
    'Cebolla': '32210', 'Ajo': '33240', 'Pepino': '32199', 'Pimiento': '32216', 'Zapallo Italiano': '32223',
    'Repollo': '32188', 'Apio': '32193', 'Espárrago': '32182', 'Champiñones': '32208', 'Coliflor': '32192',
    'Berenjena': '32200', 'Zapallo': '32108', 'Cebollín': '33240', 'Acelga': '31989', 'Vainitas': '32184',
    'Betarraga': '32185', 'Rábano': '32218',
    // Fruits
    'Plátano': '31639', 'Manzana': '31630', 'Naranja': '31586', 'Fresas': '31698', 'Arándanos': '31690',
    'Piña': '31675', 'Mango': '31620', 'Papaya': '31621', 'Sandía': '31685', 'Uvas': '31652',
    'Durazno': '31664', 'Pera': '31669', 'Kiwi': '31654', 'Limón': '31618', 'Mandarina': '31590',
    'Melón': '31656', 'Granadilla': '31663', 'Dátiles': '31618', 'Pitahaya': '31649',
    // Dairy
    'Leche': '27800', 'Yogurt': '27829', 'Queso Blanco': '28160', 'Queso Amarillo': '28124',
    'Leche de Soya': '27820', 'Leche de Almendras': '27824', 'Leche de Coco': '27828',
    // Condiments (mapped to closest available IDs)
    'Mostaza': '32500', 'Salsa de Tomate': '32148', 'Sillao': '29857', 'Vinagre': '32593',
    'Canela': '33241', 'Cúrcuma': '33242', 'Jengibre': '33243', 'Orégano': '32195', 'Albahaca': '32195', 'Pimentón': '32216',
};

export const GROCERY_CATEGORIES: GroceryCategory[] = [
    {
        id: "proteins",
        name: "Proteins",
        nameEs: "Proteínas",
        minRequired: 3, // exigir al menos 3 proteínas para asegurar cobertura USDA
        items: [
            { name: "Pollo", searchTerm: "chicken", emoji: "🍗", foodId: GROCERY_ID_MAP['Pollo'] },
            { name: "Carne", searchTerm: "beef", emoji: "🥩", foodId: GROCERY_ID_MAP['Carne'] },
            { name: "Chancho", searchTerm: "pork", emoji: "🐷", foodId: GROCERY_ID_MAP['Chancho'] },
            { name: "Pescado", searchTerm: "fish", emoji: "🐟", foodId: GROCERY_ID_MAP['Pescado'] },
            { name: "Atún", searchTerm: "tuna", emoji: "🐟", foodId: GROCERY_ID_MAP['Atún'] },
            { name: "Langostinos", searchTerm: "shrimp", emoji: "🦐", foodId: GROCERY_ID_MAP['Langostinos'] },
            { name: "Pavo", searchTerm: "turkey", emoji: "🦃", foodId: GROCERY_ID_MAP['Pavo'] },
            { name: "Huevo", searchTerm: "egg", emoji: "🥚", foodId: GROCERY_ID_MAP['Huevo'] },
            { name: "Jamón", searchTerm: "ham", emoji: "🍖", foodId: GROCERY_ID_MAP['Jamón'] },
            { name: "Tofu", searchTerm: "tofu", emoji: "🧈", foodId: GROCERY_ID_MAP['Tofu'] },
            { name: "Carne de Soya", searchTerm: "soy meat", emoji: "🌱", foodId: GROCERY_ID_MAP['Carne de Soya'] },
            { name: "Tempeh", searchTerm: "tempeh", emoji: "🫘", foodId: GROCERY_ID_MAP['Tempeh'] },
            { name: "Seitán", searchTerm: "seitan", emoji: "🍞", foodId: GROCERY_ID_MAP['Seitán'] },
            { name: "Proteína en polvo", searchTerm: "protein powder", emoji: "🥤", foodId: GROCERY_ID_MAP['Proteína en polvo'] },
        ],
    },
    {
        id: "carbs",
        name: "Carbohydrates",
        nameEs: "Carbohidratos",
        minRequired: 2,
        items: [
            { name: "Arroz", searchTerm: "rice", emoji: "🍚", foodId: GROCERY_ID_MAP['Arroz'] },
            { name: "Papa", searchTerm: "potato", emoji: "🥔", foodId: GROCERY_ID_MAP['Papa'] },
            { name: "Camote", searchTerm: "sweet potato", emoji: "🍠", foodId: GROCERY_ID_MAP['Camote'] },
            { name: "Pasta", searchTerm: "pasta", emoji: "🍝", foodId: GROCERY_ID_MAP['Pasta'] },
            { name: "Pan", searchTerm: "bread", emoji: "🍞", foodId: GROCERY_ID_MAP['Pan'] },
            { name: "Avena", searchTerm: "oats", emoji: "🌾", foodId: GROCERY_ID_MAP['Avena'] },
            { name: "Quinua", searchTerm: "quinoa", emoji: "🌾", foodId: GROCERY_ID_MAP['Quinua'] },
            { name: "Choclo", searchTerm: "corn", emoji: "🌽", foodId: GROCERY_ID_MAP['Choclo'] },
            { name: "Tortilla", searchTerm: "tortilla", emoji: "🫓", foodId: GROCERY_ID_MAP['Tortilla'] },
            { name: "Cereal", searchTerm: "cereal", emoji: "🥣", foodId: GROCERY_ID_MAP['Cereal'] },
            { name: "Yuca", searchTerm: "yuca", emoji: "🥔", foodId: GROCERY_ID_MAP['Yuca'] },
            { name: "Lentejas", searchTerm: "lentils", emoji: "🫘", foodId: GROCERY_ID_MAP['Lentejas'] },
            { name: "Frijoles", searchTerm: "beans", emoji: "🫘", foodId: GROCERY_ID_MAP['Frijoles'] },
            { name: "Garbanzos", searchTerm: "chickpeas", emoji: "🫘", foodId: GROCERY_ID_MAP['Garbanzos'] },
            { name: "Arvejas", searchTerm: "peas", emoji: "🫘", foodId: GROCERY_ID_MAP['Arvejas'] },
            { name: "Popcorn", searchTerm: "popcorn", emoji: "🍿", foodId: GROCERY_ID_MAP['Popcorn'] },
        ],
    },
    {
        id: "fats",
        name: "Fats",
        nameEs: "Grasas",
        minRequired: 2,
        items: [
            { name: "Palta", searchTerm: "avocado", emoji: "🥑", foodId: GROCERY_ID_MAP['Palta'] },
            { name: "Maní", searchTerm: "peanut", emoji: "🥜", foodId: GROCERY_ID_MAP['Maní'] },
            { name: "Mantequilla de Maní", searchTerm: "peanut butter", emoji: "🥜", foodId: GROCERY_ID_MAP['Mantequilla de Maní'] },
            { name: "Almendras", searchTerm: "almond", emoji: "🌰", foodId: GROCERY_ID_MAP['Almendras'] },
            { name: "Nueces", searchTerm: "walnut", emoji: "🌰", foodId: GROCERY_ID_MAP['Nueces'] },
            { name: "Cashews", searchTerm: "cashew", emoji: "🌰", foodId: GROCERY_ID_MAP['Cashews'] },
            { name: "Aceitunas", searchTerm: "olive", emoji: "🫒", foodId: GROCERY_ID_MAP['Aceitunas'] },
            { name: "Aceite de Oliva", searchTerm: "olive oil", emoji: "🫒", foodId: GROCERY_ID_MAP['Aceite de Oliva'] },
            { name: "Coco", searchTerm: "coconut", emoji: "🥥", foodId: GROCERY_ID_MAP['Coco'] },
            { name: "Chía", searchTerm: "chia", emoji: "🌱", foodId: GROCERY_ID_MAP['Chía'] },
            { name: "Linaza", searchTerm: "flax", emoji: "🌱", foodId: GROCERY_ID_MAP['Linaza'] },
            { name: "Pecanas", searchTerm: "pecan", emoji: "🌰", foodId: GROCERY_ID_MAP['Pecanas'] },
            { name: "Pistachos", searchTerm: "pistachio", emoji: "🌰", foodId: GROCERY_ID_MAP['Pistachos'] },
            { name: "Chocolate", searchTerm: "chocolate", emoji: "🍫", foodId: GROCERY_ID_MAP['Chocolate'] },
            { name: "Cacao en Polvo", searchTerm: "cocoa powder", emoji: "🍫", foodId: GROCERY_ID_MAP['Cacao en Polvo'] },
        ],
    },
    {
        id: "vegetables",
        name: "Vegetables",
        nameEs: "Verduras",
        minRequired: 3,
        items: [
            { name: "Lechuga", searchTerm: "lettuce", emoji: "🥬", foodId: GROCERY_ID_MAP['Lechuga'] },
            { name: "Tomate", searchTerm: "tomato", emoji: "🍅", foodId: GROCERY_ID_MAP['Tomate'] },
            { name: "Brócoli", searchTerm: "broccoli", emoji: "🥦", foodId: GROCERY_ID_MAP['Brócoli'] },
            { name: "Zanahoria", searchTerm: "carrot", emoji: "🥕", foodId: GROCERY_ID_MAP['Zanahoria'] },
            { name: "Espinaca", searchTerm: "spinach", emoji: "🥬", foodId: GROCERY_ID_MAP['Espinaca'] },
            { name: "Cebolla", searchTerm: "onion", emoji: "🧅", foodId: GROCERY_ID_MAP['Cebolla'] },
            { name: "Ajo", searchTerm: "garlic", emoji: "🧄", foodId: GROCERY_ID_MAP['Ajo'] },
            { name: "Pepino", searchTerm: "cucumber", emoji: "🥒", foodId: GROCERY_ID_MAP['Pepino'] },
            { name: "Pimiento", searchTerm: "pepper", emoji: "🫑", foodId: GROCERY_ID_MAP['Pimiento'] },
            { name: "Zapallo Italiano", searchTerm: "zucchini", emoji: "🥒", foodId: GROCERY_ID_MAP['Zapallo Italiano'] },
            { name: "Repollo", searchTerm: "cabbage", emoji: "🥬", foodId: GROCERY_ID_MAP['Repollo'] },
            { name: "Apio", searchTerm: "celery", emoji: "🥬", foodId: GROCERY_ID_MAP['Apio'] },
            { name: "Espárrago", searchTerm: "asparagus", emoji: "🌿", foodId: GROCERY_ID_MAP['Espárrago'] },
            { name: "Champiñones", searchTerm: "mushroom", emoji: "🍄", foodId: GROCERY_ID_MAP['Champiñones'] },
            { name: "Coliflor", searchTerm: "cauliflower", emoji: "🥦", foodId: GROCERY_ID_MAP['Coliflor'] },
            { name: "Berenjena", searchTerm: "eggplant", emoji: "🍆", foodId: GROCERY_ID_MAP['Berenjena'] },
            { name: "Zapallo", searchTerm: "squash", emoji: "🎃", foodId: GROCERY_ID_MAP['Zapallo'] },
            { name: "Cebollín", searchTerm: "green onion", emoji: "🧅", foodId: GROCERY_ID_MAP['Cebollín'] },
            { name: "Acelga", searchTerm: "chard", emoji: "🥬", foodId: GROCERY_ID_MAP['Acelga'] },
            { name: "Vainitas", searchTerm: "green beans", emoji: "🌿", foodId: GROCERY_ID_MAP['Vainitas'] },
            { name: "Betarraga", searchTerm: "beet", emoji: "🫐", foodId: GROCERY_ID_MAP['Betarraga'] },
            { name: "Rábano", searchTerm: "radish", emoji: "❤️", foodId: GROCERY_ID_MAP['Rábano'] },
        ],
    },
    {
        id: "fruits",
        name: "Fruits",
        nameEs: "Frutas",
        minRequired: 2,
        items: [
            { name: "Plátano", searchTerm: "banana", emoji: "🍌", foodId: GROCERY_ID_MAP['Plátano'] },
            { name: "Manzana", searchTerm: "apple", emoji: "🍎", foodId: GROCERY_ID_MAP['Manzana'] },
            { name: "Naranja", searchTerm: "orange", emoji: "🍊", foodId: GROCERY_ID_MAP['Naranja'] },
            { name: "Fresas", searchTerm: "strawberry", emoji: "🍓", foodId: GROCERY_ID_MAP['Fresas'] },
            { name: "Arándanos", searchTerm: "blueberry", emoji: "🫐", foodId: GROCERY_ID_MAP['Arándanos'] },
            { name: "Piña", searchTerm: "pineapple", emoji: "🍍", foodId: GROCERY_ID_MAP['Piña'] },
            { name: "Mango", searchTerm: "mango", emoji: "🥭", foodId: GROCERY_ID_MAP['Mango'] },
            { name: "Papaya", searchTerm: "papaya", emoji: "🍈", foodId: GROCERY_ID_MAP['Papaya'] },
            { name: "Sandía", searchTerm: "watermelon", emoji: "🍉", foodId: GROCERY_ID_MAP['Sandía'] },
            { name: "Uvas", searchTerm: "grape", emoji: "🍇", foodId: GROCERY_ID_MAP['Uvas'] },
            { name: "Durazno", searchTerm: "peach", emoji: "🍑", foodId: GROCERY_ID_MAP['Durazno'] },
            { name: "Pera", searchTerm: "pear", emoji: "🍐", foodId: GROCERY_ID_MAP['Pera'] },
            { name: "Kiwi", searchTerm: "kiwi", emoji: "🥝", foodId: GROCERY_ID_MAP['Kiwi'] },
            { name: "Limón", searchTerm: "lemon", emoji: "🍋", foodId: GROCERY_ID_MAP['Limón'] },
            { name: "Mandarina", searchTerm: "tangerine", emoji: "🍊", foodId: GROCERY_ID_MAP['Mandarina'] },
            { name: "Melón", searchTerm: "melon", emoji: "🍈", foodId: GROCERY_ID_MAP['Melón'] },
            { name: "Granadilla", searchTerm: "granadilla", emoji: "🥭", foodId: GROCERY_ID_MAP['Granadilla'] },
            { name: "Dátiles", searchTerm: "dates", emoji: "🌰", foodId: GROCERY_ID_MAP['Dátiles'] },
            { name: "Pitahaya", searchTerm: "pitahaya", emoji: "🐉", foodId: GROCERY_ID_MAP['Pitahaya'] },
        ],
    },
    {
        id: "dairy",
        name: "Dairy",
        nameEs: "Lácteos",
        minRequired: 3, // asegurar al menos 3 lácteos disponibles
        items: [
            { name: "Leche", searchTerm: "milk", emoji: "🥛", foodId: GROCERY_ID_MAP['Leche'] },
            { name: "Yogurt", searchTerm: "yogurt", emoji: "🥛", foodId: GROCERY_ID_MAP['Yogurt'] },
            { name: "Queso Blanco", searchTerm: "cheese", emoji: "🧀", foodId: GROCERY_ID_MAP['Queso Blanco'] },
            { name: "Queso Amarillo", searchTerm: "cheddar cheese", emoji: "🧀", foodId: GROCERY_ID_MAP['Queso Amarillo'] },
            { name: "Leche de Soya", searchTerm: "soy milk", emoji: "🥛", foodId: GROCERY_ID_MAP['Leche de Soya'] },
            { name: "Leche de Almendras", searchTerm: "almond milk", emoji: "🥛", foodId: GROCERY_ID_MAP['Leche de Almendras'] },
            { name: "Leche de Coco", searchTerm: "coconut milk", emoji: "🥥", foodId: GROCERY_ID_MAP['Leche de Coco'] },
        ],
    },
    {
        id: "condiments",
        name: "Condiments",
        nameEs: "Condimentos",
        minRequired: 0,
        items: [
            { name: "Mostaza", searchTerm: "mustard", emoji: "🟡", foodId: GROCERY_ID_MAP['Mostaza'] },
            { name: "Salsa de Tomate", searchTerm: "ketchup", emoji: "🍅", foodId: GROCERY_ID_MAP['Salsa de Tomate'] },
            { name: "Sillao", searchTerm: "soy sauce", emoji: "🫗", foodId: GROCERY_ID_MAP['Sillao'] },
            { name: "Vinagre", searchTerm: "vinegar", emoji: "🫗", foodId: GROCERY_ID_MAP['Vinagre'] },
            { name: "Canela", searchTerm: "cinnamon", emoji: "🌿", foodId: GROCERY_ID_MAP['Canela'] },
            { name: "Cúrcuma", searchTerm: "turmeric", emoji: "🌿", foodId: GROCERY_ID_MAP['Cúrcuma'] },
            { name: "Jengibre", searchTerm: "ginger", emoji: "🫚", foodId: GROCERY_ID_MAP['Jengibre'] },
            { name: "Orégano", searchTerm: "oregano", emoji: "🌿", foodId: GROCERY_ID_MAP['Orégano'] },
            { name: "Albahaca", searchTerm: "basil", emoji: "🌿", foodId: GROCERY_ID_MAP['Albahaca'] },
            { name: "Pimentón", searchTerm: "paprika", emoji: "🌶️", foodId: GROCERY_ID_MAP['Pimentón'] },
        ],
    },
];

export const getTotalMinRequired = () =>
    GROCERY_CATEGORIES.reduce((sum, cat) => sum + cat.minRequired, 0);

export const getCategoryById = (id: string) =>
    GROCERY_CATEGORIES.find(cat => cat.id === id);
