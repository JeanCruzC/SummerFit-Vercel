"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    Bell, Calendar, ChevronDown, Dumbbell, Flame, Home, LogOut, Menu, Moon,
    PieChart, Scale, Settings, Sun, Target, TrendingDown, UtensilsCrossed, User, X, Zap, ClipboardList
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
    { key: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard" },
    { key: "workout-plan", label: "Rutinas", icon: ClipboardList, href: "/dashboard/workout-plan" },
    { key: "exercises", label: "Ejercicios", icon: Dumbbell, href: "/dashboard/exercises" },
    { key: "equipment", label: "Equipo", icon: Settings, href: "/dashboard/equipment" },
    { key: "nutrition", label: "Nutrición", icon: UtensilsCrossed, href: "/dashboard/nutrition" },
    { key: "foods", label: "Alimentos", icon: PieChart, href: "/dashboard/foods" },
    { key: "tracking", label: "Diario", icon: Calendar, href: "/dashboard/tracking" },
    { key: "progress", label: "Progreso", icon: TrendingDown, href: "/dashboard/progress" },
    { key: "profile", label: "Perfil", icon: User, href: "/dashboard/profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }
            setUserEmail(session.user.email || null);
            setLoading(false);
        };
        checkAuth();

        // Check system preference
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark");
        }
    }, [router]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    const toggleTheme = () => {
        setTheme(t => t === "dark" ? "light" : "dark");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="text-center">
                    <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${theme === "dark" ? "dark" : ""}`}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
                {/* Mobile Header */}
                <div className="lg:hidden sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                    <div className="flex items-center justify-between h-16 px-4">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2">
                            <Menu className="h-6 w-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-xl bg-purple-500 grid place-items-center">
                                <Flame className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-semibold">SummerFit</span>
                        </div>
                        <button onClick={toggleTheme} className="p-2 -mr-2">
                            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div className="lg:hidden fixed inset-0 z-50">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                        <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 p-4">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="h-10 w-10 rounded-xl bg-purple-500 grid place-items-center">
                                        <Flame className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="font-bold text-lg">SummerFit</span>
                                </div>
                                <button onClick={() => setSidebarOpen(false)}>
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <nav className="space-y-1">
                                {NAV_ITEMS.map(item => {
                                    const isActive = item.href === "/dashboard"
                                        ? pathname === "/dashboard"
                                        : pathname?.startsWith(item.href);

                                    return (
                                        <Link
                                            key={item.key}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${isActive
                                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                }`}
                                        >
                                            <item.icon className={`h-5 w-5 ${isActive ? "text-purple-600 dark:text-purple-400" : ""}`} />
                                            <span className="text-sm">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="absolute bottom-4 left-4 right-4">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                >
                                    <LogOut className="h-5 w-5" />
                                    <span className="text-sm font-medium">Cerrar sesión</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="lg:flex">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center">
                                    <Flame className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <div className="font-bold">SummerFit</div>
                                    <div className="text-xs text-gray-500 truncate max-w-[140px]">{userEmail}</div>
                                </div>
                            </div>

                            <nav className="space-y-1">
                                {NAV_ITEMS.map(item => {
                                    const isActive = item.href === "/dashboard"
                                        ? pathname === "/dashboard"
                                        : pathname?.startsWith(item.href);

                                    return (
                                        <Link
                                            key={item.key}
                                            href={item.href}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition"
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="mt-auto p-4 space-y-2">
                            <button
                                onClick={toggleTheme}
                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            >
                                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                <span className="text-sm font-medium">{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            >
                                <LogOut className="h-5 w-5" />
                                <span className="text-sm font-medium">Cerrar sesión</span>
                            </button>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:pl-64 min-h-screen w-full">
                        <div className="p-4 lg:p-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
