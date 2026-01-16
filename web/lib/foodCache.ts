// Food Cache System - Reduces DB queries from 42 to 1 per session
import { SimpleFoodItem } from './mealGenerator';

class FoodCache {
    private static instance: FoodCache;
    private cache: Map<string, SimpleFoodItem[]> = new Map();
    private loadedAt: Date | null = null;
    private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

    private constructor() {}

    static getInstance(): FoodCache {
        if (!FoodCache.instance) {
            FoodCache.instance = new FoodCache();
        }
        return FoodCache.instance;
    }

    isValid(): boolean {
        if (!this.loadedAt) return false;
        return Date.now() - this.loadedAt.getTime() < this.CACHE_TTL_MS;
    }

    set(category: string, foods: SimpleFoodItem[]): void {
        this.cache.set(category, foods);
        this.loadedAt = new Date();
    }

    get(category: string): SimpleFoodItem[] | null {
        if (!this.isValid()) {
            this.clear();
            return null;
        }
        return this.cache.get(category) || null;
    }

    clear(): void {
        this.cache.clear();
        this.loadedAt = null;
    }
}

export const foodCache = FoodCache.getInstance();
