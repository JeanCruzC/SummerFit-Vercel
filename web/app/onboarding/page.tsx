"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, TrendingDown, TrendingUp, Minus, Target, Flame, Scale, Ruler, AlertCircle, Users, MapPin, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// App colors - Purple theme to match the rest of the app
const COLORS = {
  background: "#F9FAFB",      // Light gray (matches app)
  primary: "#8B5CF6",          // Purple
  primaryLight: "#EDE9FE",     // Light purple
  text: "#1A1A1A",             // Black
  textSecondary: "#6B7280",    // Gray
  success: "#22C55E",          // Green
  danger: "#EF4444",           // Red
};

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    goal: "",
    gender: "",
    age: "",
    height: "",
    weight: "",
    target_weight: "",
    activity_level: "",
    diet_type: "",

    goal_speed: "moderado",
    phone: "",
    location_name: "",
  });

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUserId(user.id);
      }
    };
    getUser();
  }, [router]);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const goalMap: { [key: string]: string } = {
      lose_weight: "Definir",
      maintain: "Mantener",
      gain_muscle: "Volumen",
    };

    const activityMap: { [key: string]: string } = {
      sedentary: "Sedentario",
      light: "Ligero",
      moderate: "Moderado",
      active: "Activo",
      very_active: "Muy activo",
    };

    const { error } = await supabase.from("profiles").upsert({
      user_id: userId,
      age: parseInt(formData.age),
      gender: formData.gender === "Masculino" ? "M" : "F",
      weight_kg: parseFloat(formData.weight),
      height_cm: parseFloat(formData.height),
      target_weight_kg: parseFloat(formData.target_weight),
      goal: goalMap[formData.goal] || "Mantener",
      activity_level: activityMap[formData.activity_level] || "Moderado",
      diet_type: "Estándar",
      goal_speed: formData.goal_speed,
      phone: formData.phone,
      location_name: formData.location_name,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error:", error);
      alert("Error al guardar");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard/meal-generator");
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return formData.goal;
      case 2: return formData.gender && formData.age;
      case 3: return formData.height && formData.weight && formData.target_weight;
      case 4: return formData.activity_level;
      case 5: return formData.goal_speed;
      case 6: return true; // Optional step
      default: return false;
    }
  };

  const TOTAL_STEPS = 6;

  return (
    <div style={{ backgroundColor: COLORS.background }} className="min-h-screen">
      {/* Progress Bar - Purple Theme */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-purple-100 shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-lg">
          <div className="flex gap-2">
            {[...Array(TOTAL_STEPS)].map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < currentStep ? "bg-purple-500" : "bg-zinc-200"
                  }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen pt-16 pb-8 px-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl p-8 shadow-xl border border-purple-100"
            >
              {currentStep === 1 && <GoalStep formData={formData} onChange={handleChange} />}
              {currentStep === 2 && <PersonalStep formData={formData} onChange={handleChange} />}
              {currentStep === 3 && <MeasurementsStep formData={formData} onChange={handleChange} />}
              {currentStep === 4 && <ActivityStep formData={formData} onChange={handleChange} />}
              {currentStep === 5 && <SpeedStep formData={formData} onChange={handleChange} />}
              {currentStep === 6 && <SocialStep formData={formData} onChange={handleChange} />}

              {/* Navigation */}
              <div className="flex gap-4 mt-8">
                {currentStep > 1 && (
                  <button
                    onClick={handleBack}
                    className="flex-1 py-4 rounded-2xl border-2 border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50 transition-all"
                  >
                    <ChevronLeft className="inline h-5 w-5 mr-1" />
                    Atrás
                  </button>
                )}

                {currentStep < TOTAL_STEPS ? (
                  <button
                    onClick={handleNext}
                    disabled={!isStepValid()}
                    className={`flex-1 py-4 rounded-2xl font-bold transition-all ${isStepValid()
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    Continuar
                    <ChevronRight className="inline h-5 w-5 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={!isStepValid() || isLoading}
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-black text-lg hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      <>
                        <Check className="inline h-5 w-5 mr-2" />
                        Completar
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============ STEP 1: Goal ============
function GoalStep({ formData, onChange }: any) {
  const goals = [
    { value: "lose_weight", label: "Perder Grasa", desc: "Reduce tu porcentaje de grasa corporal", icon: TrendingDown, color: "#3B82F6" },
    { value: "gain_muscle", label: "Ganar Músculo", desc: "Aumenta tu masa y fuerza muscular", icon: TrendingUp, color: "#10B981" },
    { value: "maintain", label: "Mantener Peso", desc: "Conserva tu composición corporal actual", icon: Minus, color: "#8B5CF6" },
  ];

  return (
    <div>
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primaryLight }}>
          <Target className="h-10 w-10" style={{ color: COLORS.primary }} />
        </div>
      </div>

      <h1 className="text-2xl font-black text-center mb-2">¿Cuál es tu objetivo?</h1>
      <p className="text-center text-zinc-500 mb-8 text-sm">Calcularemos tus calorías necesarias para lograrlo</p>

      <div className="space-y-3">
        {goals.map((goal) => (
          <button
            key={goal.value}
            onClick={() => onChange("goal", goal.value)}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${formData.goal === goal.value
              ? "border-purple-400 bg-purple-50"
              : "border-zinc-200 hover:border-purple-300"
              }`}
          >
            <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${goal.color}20` }}>
              <goal.icon className="h-6 w-6" style={{ color: goal.color }} />
            </div>
            <div>
              <div className="font-bold text-zinc-900">{goal.label}</div>
              <div className="text-sm text-zinc-500">{goal.desc}</div>
            </div>
            {formData.goal === goal.value && (
              <Check className="ml-auto h-5 w-5 text-purple-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ STEP 2: Personal Info ============
function PersonalStep({ formData, onChange }: any) {
  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primaryLight }}>
          <Scale className="h-10 w-10" style={{ color: COLORS.primary }} />
        </div>
      </div>

      <h1 className="text-2xl font-black text-center mb-2">Sobre ti</h1>
      <p className="text-center text-zinc-500 mb-8 text-sm">Necesitamos estos datos para calcular tus calorías</p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-bold text-zinc-700 mb-2 block">Sexo</label>
          <div className="grid grid-cols-2 gap-3">
            {["Masculino", "Femenino"].map((g) => (
              <button
                key={g}
                onClick={() => onChange("gender", g)}
                className={`py-4 rounded-2xl border-2 font-bold transition-all ${formData.gender === g
                  ? "border-purple-400 bg-purple-50 text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-purple-300"
                  }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-zinc-700 mb-2 block">Edad</label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => onChange("age", e.target.value)}
            placeholder="25"
            className="w-full px-4 py-4 rounded-2xl border-2 border-zinc-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition text-lg font-medium"
          />
        </div>
      </div>
    </div>
  );
}

// ============ STEP 3: Measurements ============
function MeasurementsStep({ formData, onChange }: any) {
  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primaryLight }}>
          <Ruler className="h-10 w-10" style={{ color: COLORS.primary }} />
        </div>
      </div>

      <h1 className="text-2xl font-black text-center mb-2">Tus medidas</h1>
      <p className="text-center text-zinc-500 mb-8 text-sm">Usaremos esto para calcular tu metabolismo</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-zinc-700 mb-2 block">Altura (cm)</label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) => onChange("height", e.target.value)}
              placeholder="175"
              className="w-full px-4 py-4 rounded-2xl border-2 border-zinc-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition text-lg font-medium"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-zinc-700 mb-2 block">Peso (kg)</label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) => onChange("weight", e.target.value)}
              placeholder="78"
              className="w-full px-4 py-4 rounded-2xl border-2 border-zinc-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition text-lg font-medium"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-zinc-700 mb-2 block">Peso Objetivo (kg)</label>
          <input
            type="number"
            value={formData.target_weight}
            onChange={(e) => onChange("target_weight", e.target.value)}
            placeholder="72"
            className="w-full px-4 py-4 rounded-2xl border-2 border-zinc-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition text-lg font-medium"
          />
        </div>
      </div>
    </div>
  );
}

// ============ STEP 4: Activity Level ============
function ActivityStep({ formData, onChange }: any) {
  const levels = [
    { value: "sedentary", label: "Sedentario", desc: "Poco o nada de ejercicio" },
    { value: "light", label: "Ligero", desc: "Ejercicio 1-2 días/semana" },
    { value: "moderate", label: "Moderado", desc: "Ejercicio 3-5 días/semana" },
    { value: "active", label: "Activo", desc: "Ejercicio 6-7 días/semana" },
    { value: "very_active", label: "Muy activo", desc: "Ejercicio intenso + trabajo físico" },
  ];

  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primaryLight }}>
          <Flame className="h-10 w-10" style={{ color: COLORS.primary }} />
        </div>
      </div>

      <h1 className="text-2xl font-black text-center mb-2">Tu nivel de actividad</h1>
      <p className="text-center text-zinc-500 mb-8 text-sm">Esto afecta cuántas calorías quemas al día</p>

      <div className="space-y-3">
        {levels.map((level) => (
          <button
            key={level.value}
            onClick={() => onChange("activity_level", level.value)}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formData.activity_level === level.value
              ? "border-purple-400 bg-purple-50"
              : "border-zinc-200 hover:border-purple-300"
              }`}
          >
            <div className="font-bold text-zinc-900">{level.label}</div>
            <div className="text-sm text-zinc-500">{level.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ STEP 5: Speed ============
function SpeedStep({ formData, onChange }: any) {
  const speeds = [
    {
      value: "conservador",
      label: "Recomendado",
      desc: "Sostenible a largo plazo",
      pros: ["Fácil de mantener", "Sin riesgo de pérdida muscular"],
      cons: []
    },
    {
      value: "moderado",
      label: "Moderado",
      desc: "Balance entre velocidad y sostenibilidad",
      pros: ["Resultados consistentes"],
      cons: ["Requiere más disciplina"]
    },
    {
      value: "acelerado",
      label: "Rápido",
      desc: "Resultados más rápidos",
      pros: ["Resultados visibles pronto"],
      cons: ["Posible pérdida de masa magra", "Alimentación más restrictiva"]
    },
  ];

  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primaryLight }}>
          <Target className="h-10 w-10" style={{ color: COLORS.primary }} />
        </div>
      </div>

      <h1 className="text-2xl font-black text-center mb-2">Velocidad</h1>
      <p className="text-center text-zinc-500 mb-8 text-sm">Último paso para calcular tus calorías y macros</p>

      <div className="space-y-3">
        {speeds.map((speed) => (
          <button
            key={speed.value}
            onClick={() => onChange("goal_speed", speed.value)}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formData.goal_speed === speed.value
              ? "border-purple-400 bg-purple-50"
              : "border-zinc-200 hover:border-purple-300"
              }`}
          >
            <div className="font-bold text-zinc-900 mb-1">{speed.label}</div>
            <div className="text-sm text-zinc-500 mb-2">{speed.desc}</div>

            {formData.goal_speed === speed.value && (
              <div className="space-y-1 mt-3 pt-3 border-t border-purple-200">
                {speed.pros.map((p, i) => (
                  <div key={i} className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> {p}
                  </div>
                ))}
                {speed.cons.map((c, i) => (
                  <div key={i} className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {c}
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-zinc-400 mt-6">No te preocupes, luego lo puedes cambiar</p>
    </div>
  );
}

// ============ STEP 6: Social (Optional) ============
function SocialStep({ formData, onChange }: any) {
  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primaryLight }}>
          <Users className="h-10 w-10" style={{ color: COLORS.primary }} />
        </div>
      </div>

      <h1 className="text-2xl font-black text-center mb-2">Conecta con la Comunidad</h1>
      <p className="text-center text-zinc-500 mb-8 text-sm">Opcional: Añade detalles para encontrar amigos cerca</p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-bold text-zinc-700 mb-2 block flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Teléfono
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="+52 55 1234 5678"
            className="w-full px-4 py-4 rounded-2xl border-2 border-zinc-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition text-lg font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-zinc-700 mb-2 block flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Ciudad / Zona
          </label>
          <input
            type="text"
            value={formData.location_name}
            onChange={(e) => onChange("location_name", e.target.value)}
            placeholder="Ej. Condesa, CDMX"
            className="w-full px-4 py-4 rounded-2xl border-2 border-zinc-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition text-lg font-medium"
          />
          <p className="text-xs text-zinc-400 mt-2">
            Esto ayuda a sugerirte amigos en tu área. Puedes configurar la privacidad más tarde.
          </p>
        </div>
      </div>
    </div>
  );
}
