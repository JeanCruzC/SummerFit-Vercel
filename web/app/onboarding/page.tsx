"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, User, Scale, Target, Zap, Apple, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Step definitions
const STEPS = [
  { id: 1, title: "Datos Personales", icon: User },
  { id: 2, title: "Medidas", icon: Scale },
  { id: 3, title: "Objetivo", icon: Target },
  { id: 4, title: "Nivel de Actividad", icon: Zap },
  { id: 5, title: "Tipo de Dieta", icon: Apple },
  { id: 6, title: "Fecha de Inicio", icon: Calendar },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    age: "",
    gender: "",

    // Step 2: Measurements
    weight: "",
    height: "",

    // Step 3: Goal
    goal: "",
    target_weight: "",

    // Step 4: Activity Level
    activity_level: "",

    // Step 5: Diet Type
    diet_type: "",

    // Step 6: Start Date
    start_date: new Date().toISOString().split("T")[0],
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
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    const supabase = createClient();

    console.log("Saving profile data:", formData); // Debug

    // Map goal values to DB format
    const goalMap: { [key: string]: string } = {
      lose_weight: "Definir",
      maintain: "Mantener",
      gain_muscle: "Volumen",
    };

    // Map activity levels to DB format
    const activityMap: { [key: string]: string } = {
      sedentary: "Sedentario",
      light: "Ligero",
      moderate: "Moderado",
      active: "Activo",
      very_active: "Muy activo",
    };

    // Map diet types to DB format
    const dietMap: { [key: string]: string } = {
      standard: "Estándar",
      vegetarian: "Vegetariana",
      vegan: "Vegana",
      keto: "Keto",
      paleo: "Paleo",
    };

    // Map gender to DB format
    const genderMap: { [key: string]: string } = {
      Masculino: "M",
      Femenino: "F",
    };

    // Create profile with all data properly mapped
    const { data, error } = await supabase.from("profiles").upsert({
      user_id: userId,
      age: parseInt(formData.age),
      gender: genderMap[formData.gender] || "M",
      weight_kg: parseFloat(formData.weight),
      height_cm: parseFloat(formData.height),
      goal: goalMap[formData.goal] || "Mantener",
      target_weight_kg: parseFloat(formData.target_weight),
      activity_level: activityMap[formData.activity_level] || "Moderado",
      diet_type: dietMap[formData.diet_type] || "Estándar",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error saving profile:", error);
      alert("Error al guardar el perfil: " + error.message);
      setIsLoading(false);
      return;
    }

    console.log("Profile saved successfully:", data);
    router.push("/dashboard");
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.age && formData.gender;
      case 2:
        return formData.weight && formData.height;
      case 3:
        return formData.goal && formData.target_weight;
      case 4:
        return formData.activity_level;
      case 5:
        return formData.diet_type;
      case 6:
        return formData.start_date;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-4xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-zinc-900">Configuración Inicial</h2>
            <span className="text-sm font-semibold text-emerald-600">
              Paso {currentStep} de {STEPS.length}
            </span>
          </div>
          <div className="flex gap-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`h-2 flex-1 rounded-full transition-all duration-500 ${step.id <= currentStep
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-zinc-200"
                  }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center pt-24 pb-12 px-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white/95 backdrop-blur-xl border-2 border-emerald-100 rounded-3xl p-8 md:p-12 shadow-2xl"
            >
              {/* Step Icon */}
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  {(() => {
                    const StepIcon = STEPS[currentStep - 1].icon;
                    return <StepIcon className="h-10 w-10 text-white" />;
                  })()}
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-center mb-3 text-zinc-900">
                {STEPS[currentStep - 1].title}
              </h1>

              {/* Step Content */}
              <div className="mt-8 space-y-6">
                {currentStep === 1 && <Step1 formData={formData} onChange={handleChange} />}
                {currentStep === 2 && <Step2 formData={formData} onChange={handleChange} />}
                {currentStep === 3 && <Step3 formData={formData} onChange={handleChange} />}
                {currentStep === 4 && <Step4 formData={formData} onChange={handleChange} />}
                {currentStep === 5 && <Step5 formData={formData} onChange={handleChange} />}
                {currentStep === 6 && <Step6 formData={formData} onChange={handleChange} />}
              </div>

              {/* Navigation */}
              <div className="flex gap-4 mt-10">
                {currentStep > 1 && (
                  <button
                    onClick={handleBack}
                    className="flex-1 py-4 rounded-xl border-2 border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50 transition-all"
                  >
                    <ChevronLeft className="inline h-5 w-5 mr-2" />
                    Atrás
                  </button>
                )}

                {currentStep < STEPS.length ? (
                  <button
                    onClick={handleNext}
                    disabled={!isStepValid()}
                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                    <ChevronRight className="inline h-5 w-5 ml-2" />
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={!isStepValid() || isLoading}
                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 text-white font-black text-lg hover:shadow-2xl hover:shadow-coral-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

// Step 1: Personal Info
function Step1({ formData, onChange }: any) {
  return (
    <div className="space-y-6">
      <p className="text-center text-zinc-600 mb-6">Cuéntanos un poco sobre ti para personalizar tu experiencia</p>

      <div>
        <label className="text-sm font-bold text-zinc-700 mb-2 block">Edad</label>
        <input
          type="number"
          value={formData.age}
          onChange={(e) => onChange("age", e.target.value)}
          placeholder="25"
          className="w-full px-4 py-4 rounded-xl border-2 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition text-lg font-medium"
        />
      </div>

      <div>
        <label className="text-sm font-bold text-zinc-700 mb-3 block">Género</label>
        <div className="grid grid-cols-2 gap-4">
          {["Masculino", "Femenino"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange("gender", option)}
              className={`py-4 rounded-xl border-2 font-bold transition-all ${formData.gender === option
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-zinc-200 text-zinc-700 hover:border-emerald-200"
                }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 2: Measurements
function Step2({ formData, onChange }: any) {
  return (
    <div className="space-y-6">
      <p className="text-center text-zinc-600 mb-6">Ingresa tus medidas actuales</p>

      <div>
        <label className="text-sm font-bold text-zinc-700 mb-2 block">Peso actual (kg)</label>
        <input
          type="number"
          step="0.1"
          value={formData.weight}
          onChange={(e) => onChange("weight", e.target.value)}
          placeholder="70.5"
          className="w-full px-4 py-4 rounded-xl border-2 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition text-lg font-medium"
        />
      </div>

      <div>
        <label className="text-sm font-bold text-zinc-700 mb-2 block">Altura (cm)</label>
        <input
          type="number"
          value={formData.height}
          onChange={(e) => onChange("height", e.target.value)}
          placeholder="175"
          className="w-full px-4 py-4 rounded-xl border-2 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition text-lg font-medium"
        />
      </div>
    </div>
  );
}

// Step 3: Goal
function Step3({ formData, onChange }: any) {
  const goals = [
    { value: "lose_weight", label: "Perder Peso", emoji: "📉" },
    { value: "maintain", label: "Mantener", emoji: "⚖️" },
    { value: "gain_muscle", label: "Ganar Músculo", emoji: "💪" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-center text-zinc-600 mb-6">¿Cuál es tu objetivo principal?</p>

      <div className="grid gap-4">
        {goals.map((goal) => (
          <button
            key={goal.value}
            type="button"
            onClick={() => onChange("goal", goal.value)}
            className={`py-6 px-6 rounded-2xl border-2 font-bold text-left transition-all flex items-center gap-4 ${formData.goal === goal.value
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 text-zinc-700 hover:border-emerald-200"
              }`}
          >
            <span className="text-4xl">{goal.emoji}</span>
            <span className="text-lg">{goal.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8">
        <label className="text-sm font-bold text-zinc-700 mb-2 block">Peso objetivo (kg)</label>
        <input
          type="number"
          step="0.1"
          value={formData.target_weight}
          onChange={(e) => onChange("target_weight", e.target.value)}
          placeholder="65.0"
          className="w-full px-4 py-4 rounded-xl border-2 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition text-lg font-medium"
        />
      </div>
    </div>
  );
}

// Step 4: Activity Level
function Step4({ formData, onChange }: any) {
  const levels = [
    { value: "sedentary", label: "Sedentario", desc: "Poco o ningún ejercicio" },
    { value: "light", label: "Ligera", desc: "Ejercicio 1-3 días/semana" },
    { value: "moderate", label: "Moderada", desc: "Ejercicio 3-5 días/semana" },
    { value: "active", label: "Activa", desc: "Ejercicio 6-7 días/semana" },
    { value: "very_active", label: "Muy Activa", desc: "Ejercicio intenso diario" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-center text-zinc-600 mb-6">¿Cuál es tu nivel de actividad física?</p>

      {levels.map((level) => (
        <button
          key={level.value}
          type="button"
          onClick={() => onChange("activity_level", level.value)}
          className={`w-full py-4 px-6 rounded-xl border-2 font-bold text-left transition-all ${formData.activity_level === level.value
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-zinc-200 text-zinc-700 hover:border-emerald-200"
            }`}
        >
          <div className="font-bold text-lg">{level.label}</div>
          <div className="text-sm font-normal opacity-70">{level.desc}</div>
        </button>
      ))}
    </div>
  );
}

// Step 5: Diet Type
function Step5({ formData, onChange }: any) {
  const diets = [
    { value: "standard", label: "Estándar", desc: "Sin restricciones" },
    { value: "vegetarian", label: "Vegetariano", desc: "Sin carne" },
    { value: "vegan", label: "Vegano", desc: "Sin productos animales" },
    { value: "keto", label: "Keto", desc: "Bajo en carbohidratos" },
    { value: "paleo", label: "Paleo", desc: "Alimentos no procesados" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-center text-zinc-600 mb-6">¿Sigues algún tipo de dieta en particular?</p>

      {diets.map((diet) => (
        <button
          key={diet.value}
          type="button"
          onClick={() => onChange("diet_type", diet.value)}
          className={`w-full py-4 px-6 rounded-xl border-2 font-bold text-left transition-all ${formData.diet_type === diet.value
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-zinc-200 text-zinc-700 hover:border-emerald-200"
            }`}
        >
          <div className="font-bold text-lg">{diet.label}</div>
          <div className="text-sm font-normal opacity-70">{diet.desc}</div>
        </button>
      ))}
    </div>
  );
}

// Step 6: Start Date
function Step6({ formData, onChange }: any) {
  return (
    <div className="space-y-6">
      <p className="text-center text-zinc-600 mb-6">¡Casi listo! Confirma la fecha de inicio</p>

      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
        <h3 className="text-2xl font-black text-emerald-700 mb-2">¡Todo listo para comenzar!</h3>
        <p className="text-zinc-600 mb-6">Tu plan personalizado estará disponible en el dashboard</p>

        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => onChange("start_date", e.target.value)}
          className="w-full px-4 py-4 rounded-xl border-2 border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition text-lg font-bold text-center"
        />
      </div>

      <div className="bg-coral-50 border-2 border-coral-200 rounded-2xl p-6">
        <h4 className="font-bold text-coral-700 mb-2">💡 Consejo:</h4>
        <p className="text-sm text-zinc-700">
          Recuerda que los mejores resultados vienen de la consistencia, no de la perfección.
          ¡Empieza hoy y mejora cada día!
        </p>
      </div>
    </div>
  );
}
