"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

interface ResearchAccessGuardProps {
  children: React.ReactNode;
}

export function ResearchAccessGuard({ children }: ResearchAccessGuardProps) {
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();
  const { dict } = useI18n();
  const t = dict.cybercrimeResearchPage.accessRestricted;

  if (isLoading && !user) {
    return (
      <div className="mx-auto flex min-h-[45vh] max-w-2xl items-center justify-center px-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
      </div>
    );
  }

  // 1. Visitante deslogado (Bloqueio estrito de acesso ao acervo de inteligência)
  if (!user) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-4 py-12 sm:py-16 text-center">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-3xl shadow-[0_0_30px_rgba(6,182,212,0.2)]">
          🔒
        </div>

        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
          {t.eyebrow}
        </span>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          {t.title}
        </h1>

        <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
          {t.subtitle}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/login?next=${encodeURIComponent(pathname || "/cybercrime-research")}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {t.loginButton}
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-6 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
          >
            {t.registerButton}
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200"
          >
            {t.backHomeButton}
          </Link>
        </div>

        {/* Aviso de Arquitetura & Simulação */}
        <div className="mt-10 w-full rounded-xl border border-cyan-500/20 bg-[#080d1a] p-4 text-left">
          <p className="font-mono text-xs leading-relaxed text-slate-400">
            ℹ️ <span className="text-cyan-300 font-semibold">{t.simulationNotice}</span>
          </p>
        </div>
      </div>
    );
  }

  // 2. Conta Suspensa (Bloqueio estrito de visualização de conteúdo de pesquisa e labs)
  if (user.isSuspended) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-4 py-12 sm:py-16 text-center">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          🛑
        </div>

        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-400">
          {t.suspendedEyebrow}
        </span>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          {t.suspendedTitle}
        </h1>

        <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
          {t.suspendedDesc}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
          >
            {t.backHomeButton}
          </Link>
          <Link
            href="/my-contributions"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-6 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
          >
            Minhas Contribuições
          </Link>
        </div>

        {/* Aviso de Arquitetura & Simulação */}
        <div className="mt-10 w-full rounded-xl border border-amber-500/20 bg-[#080d1a] p-4 text-left">
          <p className="font-mono text-xs leading-relaxed text-slate-400">
            ℹ️ <span className="text-amber-300 font-semibold">{t.simulationNotice}</span>
          </p>
        </div>
      </div>
    );
  }

  // 3. Usuários ativos autorizados (member, moderator, admin sem suspensão): renderiza o conteúdo
  return <>{children}</>;
}
