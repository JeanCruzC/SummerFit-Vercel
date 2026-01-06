export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[720px] flex-col items-start justify-center gap-4 px-6">
      <span className="rounded-full border border-border/70 bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-muted">
        404
      </span>
      <h1 className="text-3xl font-semibold">Pagina no encontrada</h1>
      <p className="text-sm text-ink-muted">
        La ruta que buscas no existe o fue movida.
      </p>
      <a className="btn btn-primary h-11" href="/">
        Volver al resumen
      </a>
    </div>
  );
}
