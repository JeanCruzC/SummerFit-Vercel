import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, CheckCircle2, Zap, Smartphone, Utensils, TrendingUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white selection:bg-[#ccff00] selection:text-black font-sans">

      {/* 1. Navbar Premium */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ccff00] text-black">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter">SummerFit</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">Funcionalidades</Link>
            <Link href="#testimonials" className="hover:text-white transition-colors">Resultados</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Precios</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-bold text-white hover:text-[#ccff00] transition-colors">
              INICIAR SESIÓN
            </Link>
            <Link href="/register">
              <Button className="h-10 bg-[#ccff00] text-black hover:bg-[#bbe000] font-black rounded-full px-6 text-sm tracking-wide transform hover:scale-105 transition-all">
                EMPEZAR AHORA
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section: Fitia Style (Split Layout) */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: Copy & CTA */}
            <div className="space-y-8 z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ccff00]/30 bg-[#ccff00]/5 px-4 py-2 backdrop-blur-sm">
                <Star className="h-4 w-4 text-[#ccff00] fill-current" />
                <span className="text-xs font-bold text-[#ccff00] tracking-widest uppercase">La app #1 de Fitness Juvenil</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.1]">
                TU CUERPO <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] to-emerald-400">
                  DE VERANO
                </span> <br />
                TODO EL AÑO.
              </h1>

              <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
                Logra tus calorías y macros sin sufrir. La alternativa inteligente a las dietas estrictas, diseñada para tu estilo de vida.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button className="h-14 w-full sm:w-auto bg-[#ccff00] text-black hover:bg-[#bbe000] text-lg font-black rounded-full px-10 shadow-[0_0_40px_rgba(204,255,0,0.4)] hover:shadow-[0_0_60px_rgba(204,255,0,0.6)] transition-all transform hover:-translate-y-1">
                    OBTENER MI PLAN
                  </Button>
                </Link>
              </div>

              {/* Social Proof Mini */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-black bg-gray-800" />
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex text-[#ccff00]">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <span className="text-sm font-medium text-gray-400">4.9/5 por +10k usuarios</span>
                </div>
              </div>
            </div>

            {/* Right: Premium Mockup */}
            <div className="relative z-10 flex justify-center lg:justify-end">
              <div className="relative w-[300px] md:w-[380px] aspect-[9/19] animate-float">
                <div className="absolute inset-0 bg-[#ccff00] blur-[120px] opacity-20" />
                <Image
                  src="/app-mockup.png"
                  alt="App Interface"
                  fill
                  className="object-contain relative z-10 drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Social Proof Banner */}
      <section className="border-y border-white/5 bg-white/5 py-10">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-8">Únete a la revolución fitness</p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Fake Logos for "Authority" */}
            <span className="text-2xl font-black text-white">MEN'S HEALTH</span>
            <span className="text-2xl font-black text-white">TEEN VOGUE</span>
            <span className="text-2xl font-black text-white">NUTRITION.IO</span>
            <span className="text-2xl font-black text-white">FITNESS+</span>
          </div>
        </div>
      </section>

      {/* 4. Feature Grid (Fitia Style) */}
      <section id="features" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">
              NO ES MAGIA. <span className="text-[#ccff00]">ES CIENCIA.</span>
            </h2>
            <p className="text-xl text-gray-400">
              Olvídate de contar calorías manualmente. Nuestra tecnología hace el trabajo sucio por ti.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Utensils}
              title="Plan de Comidas Automático"
              desc="Generamos menús deliciosos basados en tus gustos y objetivos calóricos. ¿No te gusta algo? Cámbialo con un click."
            />
            <FeatureCard
              icon={Smartphone}
              title="Escáner de Alimentos"
              desc="Base de datos con +14,000 productos. Escanea, registra y listo. Tracking en menos de 10 segundos."
            />
            <FeatureCard
              icon={TrendingUp}
              title="Proyecciones Reales"
              desc="Sabrás exactamente cuándo llegarás a tu meta. Ajusta la velocidad de tu progreso según tu motivación."
            />
          </div>
        </div>
      </section>

      {/* 5. Steps / "How it Works" */}
      <section className="py-24 bg-zinc-900/50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 bg-black">
                <Image src="/hero-bg.png" alt="Lifestyle" fill className="object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="bg-[#ccff00] text-black text-sm font-bold px-3 py-1 rounded-full w-fit mb-4">CASO DE ÉXITO</div>
                  <p className="text-2xl font-bold">"Gracias a SummerFit entendí que no tenía que dejar de comer lo que me gusta, solo aprender a contar."</p>
                  <p className="mt-2 text-gray-400 font-medium">— Alex, 19 años (-8kg en 3 meses)</p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-12">
              <h2 className="text-4xl font-black tracking-tighter">EL CAMINO MÁS FÁCIL <br /> PARA <span className="text-[#ccff00]">BAJAR DE PESO</span></h2>

              <div className="space-y-8">
                <Step
                  number="01"
                  title="Calcula tus Requerimientos"
                  desc="Ingresa tus datos y obtén tu TDEE y déficit ideal al instante."
                />
                <Step
                  number="02"
                  title="Sigue tu Plan Diario"
                  desc="Come lo que quieras, siempre que encaje en tus macros. Nosotros te guiamos."
                />
                <Step
                  number="03"
                  title="Mira tu Transformación"
                  desc="Gráficos detallados de cómo tu cuerpo cambia semana a semana."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section className="py-24">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-3xl font-black tracking-tighter text-center mb-12">PREGUNTAS FRECUENTES</h2>
          <div className="space-y-4">
            <FaqItem q="¿Es adecuado para adolescentes?" a="100%. Diseñamos las dietas priorizando el crecimiento y la energía, evitando déficits agresivos." />
            <FaqItem q="¿Necesito ir al gimnasio?" a="No es obligatorio. Puedes elegir planes para casa, cardio o simplemente control de alimentación." />
            <FaqItem q="¿La app es gratuita?" a="Tenemos un plan gratuito de por vida y opciones Premium para funciones avanzadas de IA." />
          </div>
        </div>
      </section>

      {/* 7. Footer CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#ccff00] z-0" />
        <div className="absolute inset-0 bg-[url('/hero-bg.png')] opacity-10 bg-cover bg-center mix-blend-overlay" />

        <div className="container relative z-10 mx-auto px-6 text-center">
          <h2 className="text-5xl md:text-7xl font-black text-black tracking-tighter mb-8 leading-[0.9]">
            EMPIEZA TU <br /> TRANSFORMACIÓN
          </h2>
          <Link href="/register">
            <Button className="h-16 bg-black text-white hover:bg-gray-900 text-xl font-black rounded-full px-12 shadow-2xl hover:scale-105 transition-all">
              CREAR CUENTA GRATIS
            </Button>
          </Link>
          <p className="mt-6 text-black/60 font-medium">Sin tarjeta de crédito requerida</p>
        </div>
      </section>

      <footer className="bg-black py-12 border-t border-white/10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-gray-500">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Zap className="h-5 w-5 text-[#ccff00]" />
            <span className="font-bold text-white">SummerFit Premium</span>
          </div>
          <p className="text-sm">© 2024 SummerFit. Hecho para ganar.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="group p-8 rounded-3xl bg-zinc-900 border border-white/5 hover:border-[#ccff00]/50 transition-all duration-300 hover:bg-zinc-800/50">
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ccff00]/10 text-[#ccff00] group-hover:scale-110 transition-transform">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mb-3 text-2xl font-bold text-white">{title}</h3>
      <p className="text-gray-400 leading-relaxed">
        {desc}
      </p>
    </div>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="flex gap-6">
      <div className="text-5xl font-black text-zinc-800">{number}</div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{desc}</p>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string, a: string }) {
  return (
    <div className="border-b border-white/10 pb-6">
      <div className="flex justify-between items-center cursor-pointer group">
        <h3 className="text-lg font-bold text-white group-hover:text-[#ccff00] transition-colors">{q}</h3>
        <ChevronDown className="h-5 w-5 text-gray-500" />
      </div>
      <p className="mt-3 text-gray-400 leading-relaxed">{a}</p>
    </div>
  );
}
