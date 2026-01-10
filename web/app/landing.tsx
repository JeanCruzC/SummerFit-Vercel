"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight, Star, Zap, Smartphone, Utensils, TrendingUp, ChevronDown, Check, Brain, Rocket, BarChart3, Users, Heart, Target, Award, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui";
import { useState, useEffect, useRef } from "react";

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    // PWA Install Prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // User response: outcome
      setDeferredPrompt(null);
    } else {
      // Fallback: redirect to register if install prompt not available
      window.location.href = '/register';
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-purple-50/30 text-zinc-900 font-sans antialiased overflow-x-hidden">

      {/* Navbar Float */}
      <motion.nav
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${scrolled ? "bg-white/90 backdrop-blur-xl shadow-lg border-b border-purple-100/50 py-3" : "bg-transparent py-5"}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="container mx-auto flex items-center justify-between px-6 max-w-7xl">
          <div className="flex items-center gap-2">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <Zap className="h-5 w-5 fill-current" />
            </motion.div>
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-purple-600 to-purple-600 bg-clip-text text-transparent">SummerFit</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-zinc-600">
            <Link href="#como-funciona" className="hover:text-purple-600 transition-colors">Cómo funciona</Link>
            <Link href="#comparativa" className="hover:text-purple-600 transition-colors">Comparativa</Link>
            <Link href="#testimonios" className="hover:text-purple-600 transition-colors">Testimonios</Link>
            <Link href="#faq" className="hover:text-purple-600 transition-colors">FAQ</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm font-semibold text-zinc-700 hover:text-purple-600 transition-colors">
              Login
            </Link>
            <Link href="/register">
              <motion.button
                className="h-10 bg-gradient-to-r from-coral-500 to-coral-600 text-white font-bold rounded-full px-6 text-sm shadow-lg hover:shadow-coral-500/50 transition-shadow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Empezar Gratis
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* HERO SECTION */}
      <section className="relative pt-36 pb-24 overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated Background Gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-purple-50"
          style={{ y }}
        />

        {/* Decorative Circles */}
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-96 h-96 bg-coral-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="container relative z-10 mx-auto px-6 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: Copy */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Star className="h-4 w-4 text-purple-600 fill-purple-600" />
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                  ★★★★★ 4.9/5 | +127,000 personas transformadas
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.95]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                TU TRANSFORMACIÓN<br />
                <span className="bg-gradient-to-r from-purple-600 via-purple-600 to-purple-600 bg-300% animate-gradient bg-clip-text text-transparent">
                  COMIENZA HOY
                </span><br />
                <span className="text-zinc-800">NO EL LUNES.</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                className="text-xl text-zinc-600 max-w-xl leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                La única app que se adapta a <span className="font-bold text-black">TI</span>, no tú a ella.<br />
                <span className="text-purple-600 font-semibold">IA personalizada</span> + <span className="text-coral-600 font-semibold">Comunidad real</span> = <span className="font-bold text-black">Resultados reales</span>.
              </motion.p>

              <motion.p
                className="text-lg text-zinc-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Sin restricciones. Sin culpa. Solo progreso.
              </motion.p>

              {/* CTAs */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Link href="/register">
                  <motion.button
                    className="h-14 sm:h-16 bg-gradient-to-r from-coral-500 to-coral-600 text-white text-lg sm:text-xl font-black rounded-full px-6 sm:px-10 shadow-2xl hover:shadow-coral-500/60 w-full sm:w-auto sm:min-w-[280px]"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    animate={{
                      boxShadow: [
                        "0 10px 40px rgba(255,107,107,0.4)",
                        "0 10px 50px rgba(255,107,107,0.6)",
                        "0 10px 40px rgba(255,107,107,0.4)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    EMPEZAR GRATIS - 0€
                  </motion.button>
                </Link>
              </motion.div>

              <motion.p
                className="text-sm text-zinc-400 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                ✓ Sin tarjeta de crédito · ✓ Acceso completo gratis
              </motion.p>
            </motion.div>

            {/* Right: App Mockups */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            >
              <motion.div
                className="relative w-full aspect-square"
                style={{ y: useTransform(scrollYProgress, [0, 0.5], [0, -50]) }}
                whileHover={{ scale: 1.05, rotateY: 5 }}
                transition={{ duration: 0.3 }}
              >
                <Image
                  src="/app-mockup.png"
                  alt="SummerFit App Interface"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TECH STACK BANNER */}
      <motion.section
        className="py-12 border-y border-purple-100 bg-white/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-6">
          <p className="text-center text-xs font-bold text-zinc-400 uppercase tracking-[0.3em] mb-8">Tecnología de vanguardia</p>
          <div className="flex justify-center flex-wrap gap-x-16 gap-y-6">
            {["React 18", "Next.js 15", "Framer Motion", "TailwindCSS", "Supabase AI"].map((tech, i) => (
              <motion.span
                key={tech}
                className="text-lg font-bold text-purple-600/80 hover:text-purple-600 transition-colors cursor-default"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.1 }}
              >
                {tech}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* WHY WE'RE DIFFERENT */}
      <section id="como-funciona" className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-6 max-w-7xl">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
              TECNOLOGÍA <span className="text-purple-600">VS</span> VOLUNTAD
            </h2>
            <p className="text-2xl text-zinc-600 font-medium">
              Spoiler: <span className="text-coral-600">Ambas ganan aquí</span>
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="IA Que Te Entiende De Verdad"
              desc="No más planes genéricos. Nuestra IA aprende de ti cada día: tus horarios, tus gustos, tus límites. Como un entrenador que vive en tu bolsillo."
              delay={0}
            />
            <FeatureCard
              icon={Rocket}
              title="De 0 a Hábito en 21 Días"
              desc="Sistema probado con neurociencia. Micro-objetivos diarios que tu cerebro QUIERE completar. Gamificación real, no trucos baratos."
              delay={0.2}
            />
            <FeatureCard
              icon={BarChart3}
              title="Resultados Visibles en 14 Días"
              desc="O te devolvemos tu tiempo. Seguimiento fotográfico IA, métricas corporales precisas y gráficas que hacen que quieras seguir."
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section id="comparativa" className="py-32 bg-gradient-to-b from-purple-50 to-white relative">
        <div className="container mx-auto px-6 max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              <span className="text-zinc-400">MyFitnessPal</span> VS <span className="text-zinc-400">Fitia</span> VS <span className="text-purple-600">SummerFit</span>
            </h2>
            <p className="text-xl text-zinc-600">Tú decides quién gana</p>
          </motion.div>

          <ComparisonTable />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-black tracking-tighter mb-4">
              ES RIDÍCULAMENTE <span className="text-purple-600">FÁCIL</span>
            </h2>
            <p className="text-xl text-zinc-500">(Y por eso funciona)</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-20 left-[16.66%] right-[16.66%] h-1 bg-gradient-to-r from-purple-200 via-purple-300 to-purple-200" />

            <StepCard number="1" title="CUÉNTANOS TODO" desc="2 minutos de preguntas. La IA crea tu plan maestro." delay={0} />
            <StepCard number="2" title="VIVE TU DÍA NORMAL" desc="Notificaciones inteligentes en el momento perfecto." delay={0.2} />
            <StepCard number="3" title="MIRA TU EVOLUCIÓN" desc="Gráficas adictivas. Progress pics con IA. Celebra cada win." delay={0.4} />
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section id="testimonios" className="py-32 bg-gradient-to-b from-coral-50/30 to-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-black tracking-tighter mb-4">
              NO SOMOS NOSOTROS<br />
              <span className="text-coral-600">SON ELLOS/AS</span>
            </h2>
          </motion.div>

          <TestimonialCarousel />
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/hero-community.png" alt="Comunidad" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-purple-600/90 to-teal-700/90" />
        </div>

        <div className="container relative z-10 mx-auto px-6 text-center text-white">
          <motion.h2
            className="text-5xl md:text-6xl font-black tracking-tighter mb-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            TRANSFORMA TODO<br />
            NO SOLO TU CUERPO
          </motion.h2>
          <motion.p
            className="text-2xl mb-16 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Energía. Confianza. Hábitos que duran.<br />
            127,000 personas ya están dentro.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StatCard value="2.4M" label="Workouts completados" />
            <StatCard value="890K" label="Comidas logueadas esta semana" />
            <StatCard value="127K" label="Miembros activos" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-32 bg-white">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.h2
            className="text-4xl font-black tracking-tighter text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            DUDAS COMUNES<br />
            <span className="text-zinc-400 text-2xl font-medium">(Que todos tienen al principio)</span>
          </motion.h2>

          <div className="space-y-4">
            <FaqItem q="¿Es realmente gratis?" a="Sí. 100% de features gratis para siempre. Premium añade extras opcionales." />
            <FaqItem q="¿Necesito experiencia previa?" a="Cero. Diseñado para principiantes y pros por igual." />
            <FaqItem q="¿Funciona para mi dieta específica?" a="Vegano, keto, ayuno intermitente, sin gluten... La IA se adapta a TODO." />
            <FaqItem q="¿Cuánto tiempo necesito al día?" a="10 minutos mínimo. La app se ajusta a TU vida, no al revés." />
            <FaqItem q="¿Qué pasa si tengo una lesión?" a="Modificaciones automáticas. Entrenamiento seguro siempre." />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 bg-gradient-to-br from-coral-500 via-coral-600 to-rose-600 text-white relative overflow-hidden">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        <div className="container relative z-10 mx-auto px-6 text-center">
          <motion.h2
            className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-none"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            LA VERSIÓN DE TI<br />
            QUE SIEMPRE QUISISTE SER<br />
            <span className="text-white/80">ESTÁ A UN CLICK</span>
          </motion.h2>

          <motion.button
            onClick={handleInstallClick}
            className="h-16 sm:h-20 bg-white text-purple-600 text-xl sm:text-2xl font-black rounded-full px-8 sm:px-16 shadow-2xl hover:shadow-white/50 transition-shadow w-full sm:w-auto sm:min-w-[400px]"
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.98 }}
          >
            DESCARGAR GRATIS
          </motion.button>

          <p className="mt-8 text-white/80 font-semibold">iOS y Android | No se requiere tarjeta</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-zinc-900 py-12 text-white/60 text-sm">
        <div className="container mx-auto px-6 text-center">
          <p>© 2024 SummerFit. Diseñado para transformar vidas.</p>
        </div>
      </footer>
    </div>
  );
}

// COMPONENTS

function FeatureCard({ icon: Icon, title, desc, delay }: { icon: React.ElementType, title: string, desc: string, delay: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className="group p-10 rounded-3xl bg-gradient-to-br from-purple-50 to-purple-50 border-2 border-purple-100 hover:border-purple-300 transition-all duration-500 relative overflow-hidden"
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,208,132,0.2)" }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-400/0 to-purple-400/0 group-hover:from-purple-400/10 group-hover:to-purple-400/10 transition-all duration-500"
      />

      <motion.div
        className="relative mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg text-purple-600"
        whileHover={{ rotate: 360, scale: 1.1 }}
        transition={{ duration: 0.6 }}
      >
        <Icon className="h-8 w-8" />
      </motion.div>

      <h3 className="relative mb-4 text-2xl font-black text-zinc-900">{title}</h3>
      <p className="relative text-zinc-600 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function StepCard({ number, title, desc, delay }: { number: string, title: string, desc: string, delay: number }) {
  return (
    <motion.div
      className="flex flex-col items-center text-center relative z-10"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      viewport={{ once: true }}
    >
      <motion.div
        className="h-20 w-20 bg-gradient-to-br from-coral-500 to-coral-600 rounded-full flex items-center justify-center text-3xl font-black text-white mb-6 shadow-xl"
        whileHover={{ scale: 1.1, rotate: 360 }}
        transition={{ duration: 0.5 }}
      >
        {number}
      </motion.div>
      <h3 className="text-2xl font-black text-zinc-900 mb-3 uppercase tracking-tight">{title}</h3>
      <p className="text-zinc-600 max-w-xs leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function ComparisonTable() {
  const features = [
    { name: "IA Personalizada Real", mfp: false, fitia: "partial", summerfit: "double" },
    { name: "Gratis Sin Límites", mfp: false, fitia: false, summerfit: true },
    { name: "Comunidad Activa", mfp: "partial", fitia: false, summerfit: true },
    { name: "Recetas Personalizadas", mfp: false, fitia: true, summerfit: "double" },
    { name: "Entrenador Virtual 24/7", mfp: false, fitia: false, summerfit: true },
    { name: "Sin Anuncios Invasivos", mfp: false, fitia: "partial", summerfit: true },
  ];

  return (
    <motion.div
      className="bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className="grid grid-cols-4 gap-4 p-8 bg-gradient-to-r from-purple-50 to-purple-50 font-bold text-center border-b border-purple-200">
        <div className="text-zinc-700">Característica</div>
        <div className="text-zinc-500">MyFitnessPal</div>
        <div className="text-zinc-500">Fitia</div>
        <div className="text-purple-600">SummerFit</div>
      </div>

      {features.map((feature, i) => (
        <motion.div
          key={feature.name}
          className="grid grid-cols-4 gap-4 p-6 border-b border-zinc-100 last:border-b-0 items-center text-center hover:bg-purple-50/30 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          viewport={{ once: true }}
        >
          <div className="font-semibold text-zinc-800 text-left">{feature.name}</div>
          <div>{renderCheckmark(feature.mfp)}</div>
          <div>{renderCheckmark(feature.fitia)}</div>
          <div>{renderCheckmark(feature.summerfit)}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function renderCheckmark(value: boolean | string) {
  if (value === true) return <span className="text-2xl">✅</span>;
  if (value === "double") return <span className="text-2xl">✅✅</span>;
  if (value === "partial") return <span className="text-2xl">⚠️</span>;
  return <span className="text-2xl">❌</span>;
}

function StatCard({ value, label }: { value: string, label: string }) {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <motion.div
        className="text-6xl font-black mb-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {value}
      </motion.div>
      <div className="text-xl font-semibold text-white/90">{label}</div>
    </motion.div>
  );
}

function TestimonialCarousel() {
  const testimonials = [
    { name: "María", age: "34 años", time: "4 meses", quote: "Perdí 12kg sin sentir que estaba a dieta. La app literalmente lee mi mente." },
    { name: "Carlos", age: "28 años", time: "6 meses", quote: "Nunca antes había sido tan consistente. Es como tener un coach personal 24/7." },
    { name: "Sofía", age: "22 años", time: "3 meses", quote: "Finalmente una app que entiende que tengo una vida social. Puedo salir a cenar y seguir en plan." },
  ];

  return (
    <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory scrollbar-hide">
      {testimonials.map((t, i) => (
        <motion.div
          key={i}
          className="min-w-[350px] bg-white rounded-3xl p-8 shadow-xl border border-coral-100 snap-center"
          initial={{ opacity: 0, x: 100 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.2 }}
          viewport={{ once: true }}
          whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(255,107,107,0.2)" }}
        >
          <div className="flex mb-4">
            {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-5 w-5 text-coral-500 fill-coral-500" />)}
          </div>
          <p className="text-lg text-zinc-700 mb-6 italic">"{t.quote}"</p>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full" />
            <div>
              <div className="font-bold text-zinc-900">{t.name}, {t.age}</div>
              <div className="text-sm text-zinc-500">{t.time} en SummerFit</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FaqItem({ q, a }: { q: string, a: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      className="border-2 border-purple-100 rounded-2xl overflow-hidden bg-white"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      whileHover={{ borderColor: "rgb(16 185 129)" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full p-6 text-left hover:bg-purple-50/50 transition-colors"
      >
        <h3 className="text-lg font-bold text-zinc-900">{q}</h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="h-6 w-6 text-purple-600" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="px-6 pb-6 text-zinc-600 leading-relaxed">
          {a}
        </div>
      </motion.div>
    </motion.div>
  );
}
