const steps = [
  {
    title: "Datos personales",
    description: "Genero, edad y altura."
  },
  {
    title: "Peso",
    description: "Actual y objetivo."
  },
  {
    title: "Actividad",
    description: "Ritmo diario y nivel de energia."
  },
  {
    title: "Dieta",
    description: "Preferencias y restricciones."
  },
  {
    title: "Plan recomendado",
    description: "Confirmacion final."
  }
];

export default function OnboardingPage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <div className="card animate-fade-up">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Perfil</p>
              <h1 className="text-2xl font-semibold">Configura tu plan</h1>
              <p className="text-sm text-ink-muted">
                Completa los pasos para personalizar tu ruta.
              </p>
            </div>
            <span className="rounded-full border border-border/70 bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-muted">
              Paso 1 de 5
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="grid gap-4">
              <div>
                <label className="text-xs text-ink-muted">Genero</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button className="btn btn-secondary h-11">Femenino</button>
                  <button className="btn btn-secondary h-11">Masculino</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-ink-muted">Edad</label>
                  <input className="input mt-2" placeholder="28" />
                </div>
                <div>
                  <label className="text-xs text-ink-muted">Altura (cm)</label>
                  <input className="input mt-2" placeholder="170" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button className="btn btn-ghost">Volver</button>
            <button className="btn btn-primary h-11">Continuar</button>
          </div>
        </div>

        <div className="card-soft">
          <p className="text-sm font-semibold">Ruta del perfil</p>
          <div className="mt-3 space-y-3">
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-surface text-xs font-semibold">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-ink-muted">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold">Plan recomendado</p>
              <p className="text-xs text-ink-muted">Basado en tus datos iniciales.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-surface-2 p-1 text-xs font-semibold">
              <button className="flex-1 rounded-full bg-surface px-3 py-2 text-ink">Conservador</button>
              <button className="flex-1 rounded-full bg-accent/10 px-3 py-2 text-accent">Moderado</button>
              <button className="flex-1 rounded-full bg-surface px-3 py-2 text-ink">Acelerado</button>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface-2 p-4">
              <p className="text-xs text-ink-muted">Objetivo estimado</p>
              <p className="metric text-2xl font-[650]">-0.6 kg/sem</p>
              <p className="text-xs text-ink-muted">Tiempo aproximado: 10 semanas.</p>
            </div>
            <button className="btn btn-primary h-11">Confirmar plan</button>
          </div>
        </div>
      </div>
    </div>
  );
}
