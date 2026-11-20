"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { TimelineFeed } from "@/features/timeline/timeline-feed";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { locale, setLocale } = useCatalogStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1">
        {user ? (
          <TimelineFeed locale={locale} />
        ) : (
          <>
            {/* 1. HERO SECTION (Public Landing) */}
            <section className="relative overflow-hidden border-b border-slate-800/80 bg-cyber-grid py-12 sm:py-20 lg:py-24">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-medium text-cyan-300 sm:px-3.5 sm:text-xs">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    <span className="truncate">{dict.hero.eyebrow}</span>
                  </div>

                  <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-50 sm:mt-6 sm:text-4xl lg:text-5xl lg:leading-[1.15]">
                    {dict.hero.titleStart}
                    <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                      {dict.hero.titleHighlight}
                    </span>
                    {dict.hero.titleEnd}
                  </h1>

                  <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:mt-5 sm:text-base lg:text-lg">
                    {dict.hero.subtitle}
                  </p>

                  <div className="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 sm:py-2.5"
                    >
                      {dict.nav.signIn}
                      <span aria-hidden="true">→</span>
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-[#0d1322] px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 sm:py-2.5"
                    >
                      {dict.nav.signUp}
                    </Link>
                  </div>
                </div>

                {/* Visitor Platform Pillars & Access Notice */}
                <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-4 shadow-2xl backdrop-blur sm:mt-10 sm:p-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:text-xs">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                      <span className="truncate">{dict.hero.stats.categories}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:text-xs">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      <span className="truncate">
                        {dict.hero.stats.resourceTypes}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:text-xs">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span className="truncate">{dict.hero.stats.openSource}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:text-xs">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      <span className="truncate">{dict.hero.stats.bilingual}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. COMMUNITY CONTRIBUTION WORKFLOW SECTION */}
            <section id="contribute" className="py-16 sm:py-20">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-[#0d1322] via-[#0b1120] to-indigo-950/30 p-5 sm:p-10 lg:p-12">
                  <div className="max-w-2xl">
                    <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
                      {dict.contributeSection.eyebrow}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                      {dict.contributeSection.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {dict.contributeSection.subtitle}
                    </p>
                  </div>

                  <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800/90 bg-[#070b14]/80 p-5">
                      <span className="font-mono text-xs font-semibold text-cyan-400">
                        {locale === "pt-BR" ? "STATUS: PENDENTE" : "STATUS: PENDING"}
                      </span>
                      <h3 className="mt-2 text-base font-semibold text-slate-100">
                        {dict.contributeSection.steps.step1Title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                        {dict.contributeSection.steps.step1Desc}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800/90 bg-[#070b14]/80 p-5">
                      <span className="font-mono text-xs font-semibold text-indigo-400">
                        {locale === "pt-BR" ? "REVISÃO DE MODERAÇÃO" : "MODERATION REVIEW"}
                      </span>
                      <h3 className="mt-2 text-base font-semibold text-slate-100">
                        {dict.contributeSection.steps.step2Title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                        {dict.contributeSection.steps.step2Desc}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800/90 bg-[#070b14]/80 p-5">
                      <span className="font-mono text-xs font-semibold text-emerald-400">
                        {locale === "pt-BR" ? "STATUS: APROVADO" : "STATUS: APPROVED"}
                      </span>
                      <h3 className="mt-2 text-base font-semibold text-slate-100">
                        {dict.contributeSection.steps.step3Title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                        {dict.contributeSection.steps.step3Desc}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-slate-800/80 pt-6 sm:flex-row sm:items-center">
                    <p className="text-xs text-slate-400">
                      {dict.contributeSection.securityNote}
                    </p>
                    <Link
                      href="/register"
                      className="w-full shrink-0 rounded-xl bg-cyan-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 sm:w-auto sm:py-2.5"
                    >
                      {dict.nav.signUp} →
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
