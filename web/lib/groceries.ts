// Grocery categories for pantry selection
// Generated from USDA database analysis

export interface GroceryItem {
    name: string;      // Spanish name for UI
    searchTerm: string; // English term for USDA search
    emoji: string;
}

export interface GroceryCategory {
    id: string;
    name: string;
    nameEs: string;
    minRequired: number;
    items: GroceryItem[];
}

export const GROCERY_CATEGORIES: GroceryCategory[] = [
    {
        id: "proteins",
        name: "Proteins",
        nameEs: "Proteínas",
        minRequired: 2,
        items: [
            { name: "Pollo", searchTerm: "chicken", emoji: "🍗" },
            { name: "Carne", searchTerm: "beef", emoji: "🥩" },
            { name: "Chancho", searchTerm: "pork", emoji: "🐷" },
            { name: "Pescado", searchTerm: "fish", emoji: "🐟" },
            { name: "Atún", searchTerm: "tuna", emoji: "🐟" },
            { name: "Salmón", searchTerm: "salmon", emoji: "🐟" },
            { name: "Langostinos", searchTerm: "shrimp", emoji: "🦐" },
            { name: "Pavo", searchTerm: "turkey", emoji: "🦃" },
            { name: "Huevo", searchTerm: "egg", emoji: "🥚" },
            { name: "Jamón", searchTerm: "ham", emoji: "🍖" },
            { name: "Tocino", searchTerm: "bacon", emoji: "🥓" },
            { name: "Tofu", searchTerm: "tofu", emoji: "🧈" },
            { name: "Frijoles", searchTerm: "beans", emoji: "🫘" },
            { name: "Lentejas", searchTerm: "lentils", emoji: "🫘" },
            { name: "Garbanzos", searchTerm: "chickpeas", emoji: "🫘" },
        ],
    },
    {
        id: "carbs",
        name: "Carbohydrates",
        nameEs: "Carbohidratos",
        minRequired: 2,
        items: [
            { name: "Arroz", searchTerm: "rice", emoji: "🍚" },
            { name: "Papa", searchTerm: "potato", emoji: "🥔" },
            { name: "Camote", searchTerm: "sweet potato", emoji: "🍠" },
            { name: "Pasta", searchTerm: "pasta", emoji: "🍝" },
            { name: "Pan", searchTerm: "bread", emoji: "🍞" },
            { name: "Avena", searchTerm: "oats", emoji: "🌾" },
            { name: "Quinua", searchTerm: "quinoa", emoji: "🌾" },
            { name: "Choclo", searchTerm: "corn", emoji: "🌽" },
            { name: "Tortilla", searchTerm: "tortilla", emoji: "🫓" },
            { name: "Cereal", searchTerm: "cereal", emoji: "🥣" },
            { name: "Fideos", searchTerm: "noodles", emoji: "🍜" },
        ],
    },
    {
        id: "fats",
        name: "Fats",
        nameEs: "Grasas",
        minRequired: 2,
        items: [
            { name: "Palta", searchTerm: "avocado", emoji: "🥑" },
            { name: "Maní", searchTerm: "peanut", emoji: "🥜" },
            { name: "Mantequilla de Maní", searchTerm: "peanut butter", emoji: "🥜" },
            { name: "Almendras", searchTerm: "almond", emoji: "🌰" },
            { name: "Nueces", searchTerm: "walnut", emoji: "🌰" },
            { name: "Cashews", searchTerm: "cashew", emoji: "🌰" },
            { name: "Aceitunas", searchTerm: "olive", emoji: "🫒" },
            { name: "Aceite de Oliva", searchTerm: "olive oil", emoji: "🫒" },
            { name: "Coco", searchTerm: "coconut", emoji: "🥥" },
            { name: "Chía", searchTerm: "chia", emoji: "🌱" },
            { name: "Linaza", searchTerm: "flax", emoji: "🌱" },
        ],
    },
    {
        id: "vegetables",
        name: "Vegetables",
        nameEs: "Verduras",
        minRequired: 3,
        items: [
            { name: "Lechuga", searchTerm: "lettuce", emoji: "🥬" },
            { name: "Tomate", searchTerm: "tomato", emoji: "🍅" },
            { name: "Brócoli", searchTerm: "broccoli", emoji: "🥦" },
            { name: "Zanahoria", searchTerm: "carrot", emoji: "🥕" },
            { name: "Espinaca", searchTerm: "spinach", emoji: "🥬" },
            { name: "Cebolla", searchTerm: "onion", emoji: "🧅" },
            { name: "Ajo", searchTerm: "garlic", emoji: "🧄" },
            { name: "Pepino", searchTerm: "cucumber", emoji: "🥒" },
            { name: "Pimiento", searchTerm: "pepper", emoji: "🫑" },
            { name: "Zapallo Italiano", searchTerm: "zucchini", emoji: "🥒" },
            { name: "Repollo", searchTerm: "cabbage", emoji: "🥬" },
            { name: "Apio", searchTerm: "celery", emoji: "🥬" },
            { name: "Espárrago", searchTerm: "asparagus", emoji: "🌿" },
            { name: "Champiñones", searchTerm: "mushroom", emoji: "🍄" },
            { name: "Coliflor", searchTerm: "cauliflower", emoji: "🥦" },
            { name: "Berenjena", searchTerm: "eggplant", emoji: "🍆" },
            { name: "Zapallo", searchTerm: "squash", emoji: "🎃" },
        ],
    },
    {
        id: "fruits",
        name: "Fruits",
        nameEs: "Frutas",
        minRequired: 2,
        items: [
            { name: "Plátano", searchTerm: "banana", emoji: "🍌" },
            { name: "Manzana", searchTerm: "apple", emoji: "🍎" },
            { name: "Naranja", searchTerm: "orange", emoji: "🍊" },
            { name: "Fresas", searchTerm: "strawberry", emoji: "🍓" },
            { name: "Arándanos", searchTerm: "blueberry", emoji: "🫐" },
            { name: "Piña", searchTerm: "pineapple", emoji: "🍍" },
            { name: "Mango", searchTerm: "mango", emoji: "🥭" },
            { name: "Papaya", searchTerm: "papaya", emoji: "🍈" },
            { name: "Sandía", searchTerm: "watermelon", emoji: "🍉" },
            { name: "Uvas", searchTerm: "grape", emoji: "🍇" },
            { name: "Durazno", searchTerm: "peach", emoji: "🍑" },
            { name: "Pera", searchTerm: "pear", emoji: "🍐" },
            { name: "Kiwi", searchTerm: "kiwi", emoji: "🥝" },
            { name: "Limón", searchTerm: "lemon", emoji: "🍋" },
            { name: "Mandarina", searchTerm: "tangerine", emoji: "🍊" },
            { name: "Melón", searchTerm: "melon", emoji: "🍈" },
        ],
    },
    {
        id: "dairy",
        name: "Dairy",
        nameEs: "Lácteos",
        minRequired: 1,
        items: [
            { name: "Leche", searchTerm: "milk", emoji: "🥛" },
            { name: "Yogurt", searchTerm: "yogurt", emoji: "🥛" },
            { name: "Queso", searchTerm: "cheese", emoji: "🧀" },
            { name: "Requesón", searchTerm: "cottage cheese", emoji: "🧀" },
            { name: "Crema", searchTerm: "cream", emoji: "🥛" },
            { name: "Mantequilla", searchTerm: "butter", emoji: "🧈" },
            { name: "Leche de Soya", searchTerm: "soy milk", emoji: "🥛" },
            { name: "Leche de Almendras", searchTerm: "almond milk", emoji: "🥛" },
            { name: "Leche de Coco", searchTerm: "coconut milk", emoji: "🥥" },
        ],
    },
    {
        id: "condiments",
        name: "Condiments",
        nameEs: "Condimentos",
        minRequired: 0,
        items: [
            { name: "Mostaza", searchTerm: "mustard", emoji: "🟡" },
            { name: "Salsa de Tomate", searchTerm: "ketchup", emoji: "🍅" },
            { name: "Sillao", searchTerm: "soy sauce", emoji: "🫗" },
            { name: "Vinagre", searchTerm: "vinegar", emoji: "🫗" },
            { name: "Miel", searchTerm: "honey", emoji: "🍯" },
            { name: "Canela", searchTerm: "cinnamon", emoji: "🌿" },
            { name: "Cúrcuma", searchTerm: "turmeric", emoji: "🌿" },
            { name: "Jengibre", searchTerm: "ginger", emoji: "🫚" },
            { name: "Orégano", searchTerm: "oregano", emoji: "🌿" },
            { name: "Albahaca", searchTerm: "basil", emoji: "🌿" },
        ],
    },
];

export const getTotalMinRequired = () =>
    GROCERY_CATEGORIES.reduce((sum, cat) => sum + cat.minRequired, 0);

export const getCategoryById = (id: string) =>
    GROCERY_CATEGORIES.find(cat => cat.id === id);
