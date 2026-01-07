"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, Eye, EyeOff, User, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.fullName || !formData.email || !formData.password) {
      setError("Por favor completa todos los campos");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { data: { full_name: formData.fullName } },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 py-12 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-coral-400/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-3 group">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg group-hover:shadow-emerald-500/50 transition-all group-hover:scale-105">
              <Zap className="h-7 w-7 fill-current" />
            </div>
            <span className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              SummerFit
            </span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl border-2 border-emerald-100 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black mb-2 text-zinc-900">Crea tu cuenta</h1>
            <p className="text-zinc-600 font-medium">Comienza tu transformación hoy</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700" htmlFor="fullName">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border-2 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition font-medium"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border-2 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700" htmlFor="password">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white border-2 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-600 transition"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700" htmlFor="confirmPassword">Confirmar contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repite tu contraseña"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border-2 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 text-white font-black text-lg hover:shadow-2xl hover:shadow-coral-500/50 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:scale-100 mt-6"
            >
              {isLoading ? (
                <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Crear Cuenta
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-zinc-600 mt-8 font-medium">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>

        {/* Trust Badge */}
        <div className="mt-6 text-center text-sm text-zinc-500 font-medium">
          ✓ Sin tarjeta de crédito · ✓ Cancela cuando quieras
        </div>
      </div>
    </div>
  );
}
