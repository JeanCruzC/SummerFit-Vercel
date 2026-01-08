"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Por favor completa todos los campos");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-10 top-10 h-80 w-80 bg-emerald-400/20 blur-3xl rounded-full animate-pulse" />
        <div className="absolute -right-20 bottom-10 h-96 w-96 bg-coral-400/20 blur-3xl rounded-full animate-pulse" />
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
          <p className="mt-3 text-sm text-zinc-600 font-medium">Accede a tu dashboard personal</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl border-2 border-emerald-100 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-zinc-900 mb-2">Bienvenido de vuelta</h1>
            <p className="text-sm text-zinc-600 font-medium">Inicia sesión para continuar</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border-2 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition font-medium text-zinc-900 placeholder:text-zinc-400"
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white border-2 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition font-medium text-zinc-900 placeholder:text-zinc-400"
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
                  Iniciar Sesión
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-zinc-600 mt-8 font-medium">
            ¿No tienes una cuenta?{" "}
            <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>

        {/* Trust Badge */}
        <div className="mt-6 text-center text-sm text-zinc-500 font-medium">
          ✓ Acceso seguro · ✓ Tus datos están protegidos
        </div>
      </div>
    </div>
  );
}
