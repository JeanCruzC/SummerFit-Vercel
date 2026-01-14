"use client";

import React from "react";

// Utility function
function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}

// Card component
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn(
            "rounded-2xl border border-gray-200 dark:border-gray-700",
            "bg-white dark:bg-gray-900 shadow-sm p-6",
            className
        )}>
            {children}
        </div>
    );
}

// Button component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
}

export function Button({ variant = "primary", size = "md", children, className, ...props }: ButtonProps) {
    const base = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50";

    const variants = {
        primary: "bg-purple-600 text-white hover:bg-purple-700",
        secondary: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-200",
        ghost: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
        danger: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
    };

    const sizes = {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base",
    };

    return (
        <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
            {children}
        </button>
    );
}

// Input component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
    return (
        <div className="space-y-1.5">
            {label && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
            <input
                className={cn(
                    "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700",
                    "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                    "focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800",
                    "outline-none transition",
                    error && "border-red-500",
                    className
                )}
                {...props}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
}

export function Select({ label, options, className, ...props }: SelectProps) {
    return (
        <div className="space-y-1.5">
            {label && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
            <select
                className={cn(
                    "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700",
                    "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                    "focus:border-purple-500 focus:ring-2 focus:ring-purple-200",
                    "outline-none transition",
                    className
                )}
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}

// Progress Bar
export function ProgressBar({ value, max, color = "purple" }: { value: number; max: number; color?: string }) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const colorClass = color === "green" ? "bg-green-500" : color === "amber" ? "bg-amber-500" : "bg-purple-500";

    return (
        <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
        </div>
    );
}

// Stat Card
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    caption?: string;
    trend?: "up" | "down" | "neutral";
}

export function StatCard({ icon, label, value, caption, trend }: StatCardProps) {
    const trendColor = trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-500";

    return (
        <Card className="p-5">
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 grid place-items-center text-purple-600 dark:text-purple-400">
                {icon}
            </div>
            <div className="mt-4 text-sm text-gray-500">{label}</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</div>
            {caption && <div className={cn("mt-2 text-xs", trendColor)}>{caption}</div>}
        </Card>
    );
}

// Alert/Warning Box
interface AlertProps {
    type: "info" | "warning" | "danger" | "success";
    children: React.ReactNode;
}

export function Alert({ type, children }: AlertProps) {
    const styles = {
        info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
        warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
        danger: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
        success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
    };

    return (
        <div className={cn("p-4 rounded-xl border text-sm", styles[type])}>
            {children}
        </div>
    );
}

// Segmented Control
interface SegmentedProps {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
}

export function Segmented({ options, value, onChange }: SegmentedProps) {
    return (
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1">
            {options.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "h-9 px-3 rounded-lg text-sm font-medium transition",
                        opt.value === value
                            ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// Chip/Tag
export function Chip({ children, color = "gray", className }: { children: React.ReactNode; color?: "gray" | "purple" | "green" | "red" | "amber"; className?: string }) {
    const colors = {
        gray: "bg-gray-100 text-gray-600 border-gray-200",
        purple: "bg-purple-100 text-purple-700 border-purple-200",
        green: "bg-green-100 text-green-700 border-green-200",
        red: "bg-red-100 text-red-700 border-red-200",
        amber: "bg-amber-100 text-amber-700 border-amber-200",
    };

    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium", colors[color], className)}>
            {children}
        </span>
    );
}

// Ring Progress
export function RingProgress({ value, size = 120, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) {
    const r = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * r;
    const dash = (Math.max(0, Math.min(100, value)) / 100) * c;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-gray-200 dark:text-gray-700"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="text-purple-500"
            />
        </svg>
    );
}

// Skeleton loader
export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={cn("animate-pulse bg-gray-200 dark:bg-gray-700 rounded", className)} />
    );
}

// Modal
interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
                {children}
            </div>
        </div>
    );
}

// Switch
interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}

export function Switch({ checked, onCheckedChange }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950",
                checked ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"
            )}
        >
            <span
                className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}
