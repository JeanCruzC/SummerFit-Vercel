import Link from "next/link";
import { Dumbbell, Target, TrendingUp, Utensils, Calendar, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              SummerFit
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Iniciar sesión
            </Link>
            <Link 
              href="/register" 
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full text-purple-700 font-semibold text-sm mb-8">
            <Sparkles className="h-4 w-4" />
            Tu coach personal de fitness
          </div>
          <h1 className="text-6xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent leading-tight">
            Transforma tu cuerpo
            <br />
            este verano
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Dashboard premium de fitness con seguimiento inteligente, calculadora de objetivos, 
            generador de recetas y recomendador de suplementos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register" 
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all inline-flex items-center justify-center gap-2"
            >
              Comenzar ahora
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              href="/login" 
              className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-bold text-lg hover:border-purple-300 transition-all"
            >
              Ver demo
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Todo lo que necesitas en un solo lugar</h2>
            <p className="text-xl text-gray-600">Herramientas profesionales para alcanzar tus objetivos</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Calculadora de Objetivos",
                description: "Proyecciones científicas con fecha estimada, velocidad saludable y warnings personalizados."
              },
              {
                icon: TrendingUp,
                title: "Dashboard Premium",
                description: "Métricas en tiempo real, gráficas de progreso, gauge de avance y análisis de adherencia."
              },
              {
                icon: Utensils,
                title: "Generador de Recetas",
                description: "Combina alimentos según tus macros, calorías y tipo de dieta con un solo clic."
              },
              {
                icon: Calendar,
                title: "Registro Diario",
                description: "Trackea peso, calorías, macros y ejercicio con buscador inteligente de alimentos."
              },
              {
                icon: Dumbbell,
                title: "Planes Personalizados",
                description: "Ajustes automáticos según tu género, edad, actividad y objetivo fitness."
              },
              {
                icon: Sparkles,
                title: "Suplementos IA",
                description: "Recomendaciones inteligentes de suplementos según tu objetivo y dieta."
              }
            ].map((feature, idx) => (
              <div 
                key={idx} 
                className="p-8 bg-white rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all"
              >
                <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">¿Por qué SummerFit?</h2>
              <div className="space-y-4">
                {[
                  "Autenticación segura con Supabase",
                  "Persistencia de datos en la nube",
                  "UI premium con glassmorphism y gradientes",
                  "Responsive mobile-first design",
                  "Cálculos científicos validados",
                  "Base de datos de alimentos completa",
                  "Gráficas interactivas con Plotly",
                  "Modo demo sin registro"
                ].map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <span className="text-lg text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-12 text-white">
              <h3 className="text-3xl font-bold mb-6">Comienza hoy</h3>
              <p className="text-lg mb-8 text-purple-100">
                Únete a miles de usuarios que ya están transformando su cuerpo con SummerFit.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold">1</span>
                  </div>
                  <span className="text-lg">Crea tu cuenta gratis</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold">2</span>
                  </div>
                  <span className="text-lg">Configura tu perfil</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold">3</span>
                  </div>
                  <span className="text-lg">Alcanza tus objetivos</span>
                </div>
              </div>
              <Link 
                href="/register" 
                className="mt-8 block w-full py-4 bg-white text-purple-600 rounded-xl font-bold text-center hover:shadow-2xl transition-all"
              >
                Comenzar ahora
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-5xl font-bold mb-6">¿Listo para transformarte?</h2>
          <p className="text-xl mb-10 text-purple-100">
            Empieza tu viaje fitness hoy. Sin tarjeta de crédito requerida.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-purple-600 rounded-xl font-bold text-xl hover:shadow-2xl transition-all"
          >
            Crear cuenta gratis
            <ArrowRight className="h-6 w-6" />
          </Link>
        </div>
      </section>

      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-white">SummerFit</span>
          </div>
          <p className="text-sm mb-4">
            © 2025 SummerFit. Todos los derechos reservados.
          </p>
          <p className="text-xs text-gray-500">
            Esta app es solo informativa. Consulta a un profesional médico antes de hacer cambios en tu dieta o ejercicio.
          </p>
        </div>
      </footer>
    </div>
  );
}
