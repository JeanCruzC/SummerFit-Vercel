"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[720px] flex-col items-start justify-center gap-4 px-6">
      <span className="rounded-full border border-border/70 bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-muted">
        Ocurrio un error
      </span>
      <h1 className="text-3xl font-semibold">Algo no salio como esperabamos.</h1>
      <p className="text-sm text-ink-muted">
        Puedes intentar recargar la vista o volver al inicio.
      </p>
      <div className="flex items-center gap-2">
        <button className="btn btn-primary h-11" onClick={reset}>
          Reintentar
        </button>
        <a className="btn btn-secondary h-11" href="/">
          Ir al inicio
        </a>
      </div>
    </div>
  );
}
