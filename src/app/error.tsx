"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const { locale } = useCatalogStore();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    // Log error cleanly without exposing sensitive telemetry in production
    console.error("[VEXOR_RUNTIME_ERROR]:", error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070b14] px-4 py-16 text-slate-100 antialiased">
      <div className="mx-auto max-w-xl text-center">
        <div className="relative mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-3xl shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          ⚠️
        </div>

        <div className="inline-block rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-mono text-xs font-semibold text-red-400">
          500 · RUNTIME_EXCEPTION
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          {isPt ? "Instabilidade no Módulo" : "Module Runtime Interruption"}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {isPt
            ? "Ocorreu uma falha inesperada durante o processamento da interface. Nenhuma alteração foi gravada indevidamente no seu estado local."
            : "An unexpected runtime condition occurred while rendering this interface. No corrupted state was persisted."}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            ↻ {isPt ? "Tentar Novamente" : "Retry Operation"}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-6 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
          >
            {isPt ? "Voltar ao Início" : "Back to Home"}
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-[#080d1a] p-4 text-left font-mono text-xs text-slate-500">
          <p>[RECOVERY]: Session state preserved safely. If the issue persists, clear local session or report to administrators.</p>
        </div>
      </div>
    </div>
  );
}
