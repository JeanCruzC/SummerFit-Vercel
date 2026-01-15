"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, X, Loader2 } from 'lucide-react';

interface FoodItem {
    id: number;
    name: string;
    emoji?: string;
    kcal_per_100g: number;
    protein_g_per_100g: number;
    carbs_g_per_100g: number;
    fat_g_per_100g: number;
    is_simple_ingredient?: boolean;
}

interface FoodSearchInputProps {
    onSelect: (food: FoodItem) => void;
    placeholder?: string;
    className?: string;
}

export function FoodSearchInput({ onSelect, placeholder = "Buscar alimento...", className = "" }: FoodSearchInputProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FoodItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // Debounced search
    const searchFoods = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('foods')
                .select('id, name, emoji, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, is_simple_ingredient')
                .ilike('name', `%${searchQuery}%`)
                .order('is_simple_ingredient', { ascending: false })
                .order('priority', { ascending: true })
                .order('name', { ascending: true })
                .limit(10);

            if (error) throw error;

            setResults(data || []);
            setIsOpen(true);
            setSelectedIndex(-1);
        } catch (err) {
            console.error('Error searching foods:', err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            searchFoods(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, searchFoods]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    const handleSelect = (food: FoodItem) => {
        onSelect(food);
        setQuery('');
        setResults([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                )}
                {!isLoading && query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                    {results.map((food, index) => (
                        <button
                            key={food.id}
                            onClick={() => handleSelect(food)}
                            className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index === selectedIndex ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                                } ${index === 0 ? 'rounded-t-xl' : ''} ${index === results.length - 1 ? 'rounded-b-xl' : ''}`}
                        >
                            {/* Emoji */}
                            <span className="text-xl w-8 text-center">
                                {food.emoji || '🍽️'}
                            </span>

                            {/* Food Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                    {food.name}
                                    {food.is_simple_ingredient && (
                                        <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">⭐ Simple</span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {Math.round(food.kcal_per_100g)} kcal · P:{Math.round(food.protein_g_per_100g)}g · C:{Math.round(food.carbs_g_per_100g)}g · G:{Math.round(food.fat_g_per_100g)}g
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No Results */}
            {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 text-center text-sm text-gray-500">
                    No se encontraron alimentos para "{query}"
                </div>
            )}
        </div>
    );
}
