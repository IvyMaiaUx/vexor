"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function NotFound() {
  const { locale, setLocale } = useCatalogStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 flex items-center justify-center py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="relative mb-6 inline-flex h-24 w-24 items-center justify-center rounded-3xl border border-cyan-500/30 bg-[#0d1322] text-4xl shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            🔍
          </div>

          <div className="inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 font-mono text-xs font-semibold text-cyan-400">
            HTTP 404 · ROUTE_NOT_FOUND
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-100 sm:text-4xl">
            {isPt ? "Página Não Encontrada" : "Page Not Found"}
          </h1>

          <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-400">
            {isPt
              ? "A rota solicitada não existe na plataforma Vexor, foi renomeada ou está temporariamente indisponível. Utilize os atalhos abaixo para continuar sua navegação."
              : "The requested route does not exist on the Vexor platform, has been relocated, or is temporarily unavailable. Use the shortcuts below to continue navigating."}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              ← {isPt ? "Voltar ao Início" : "Back to Home"}
            </Link>
            <Link
              href="/catalog"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-6 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
            >
              {isPt ? "Explorar Catálogo" : "Explore Catalog"}
            </Link>
            <Link
              href="/forum"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-6 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
            >
              {isPt ? "Fórum Técnico" : "Technical Forum"}
            </Link>
            <Link
              href="/cybercrime-research"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-6 py-2.5 text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
            >
              {isPt ? "Cybercrime Research" : "Cybercrime Research"}
            </Link>
          </div>

          <div className="mt-12 rounded-2xl border border-slate-800/80 bg-[#080d1a] p-4 text-left">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
              <span className="text-cyan-400">$</span>
              <span>vexor-triage --verify-endpoint</span>
            </div>
            <p className="mt-2 font-mono text-xs text-slate-500">
              [SYSTEM] Status: 404 Unmapped Resource. No administrative endpoints or private data were exposed.
            </p>
          </div>
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
