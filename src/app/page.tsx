"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { siteConfig } from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { TimelineFeed } from "@/features/timeline/timeline-feed";
import { getDictionary } from "@/lib/i18n/dictionaries";

const LANDING_COMMUNITIES = [
  "Blue Team",
  "Red Team",
  "OSINT",
  "DFIR",
  "Segurança de IA",
];

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { locale, setLocale } = useCatalogStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  if (user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} onLocaleChange={setLocale} dict={dict} />
        <main className="flex-1">
          <TimelineFeed locale={locale} />
        </main>
        <Footer locale={locale} dict={dict} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1">
        {/* 1. HERO SECTION (Public Landing) */}
        <section className="relative overflow-hidden bg-cyber-grid pb-8 pt-6 sm:pb-14 sm:pt-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300 sm:text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                <span className="truncate">{dict.hero.eyebrow}</span>
              </div>

              <h1 className="mt-4 text-3xl font-bold leading-[1.15] tracking-tight text-slate-50 sm:mt-6 sm:text-5xl">
                {dict.hero.titleStart}
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                  {dict.hero.titleHighlight}
                </span>
                {dict.hero.titleEnd}
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-400 sm:mt-5 sm:text-lg">
                {dict.hero.subtitle}
              </p>

              {/* Primary + Secondary CTAs */}
              <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:justify-center sm:gap-3">
                <Link
                  href="/register"
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 text-base font-bold text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 sm:w-auto"
                >
                  <span>
                    {isPt ? "Criar conta grátis" : "Create free account"}
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-slate-700/80 bg-[#0d1322] px-6 text-base font-medium text-slate-100 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 sm:w-auto"
                >
                  {isPt ? "Já tenho conta · Entrar" : "I have an account · Sign in"}
                </Link>
              </div>
            </div>

            {/* Numbers Strip */}
            <div className="mt-7 grid grid-cols-4 border-y border-slate-800/90 py-4 text-center sm:mt-10">
              <div>
                <p className="font-mono text-lg font-bold text-cyan-400 sm:text-2xl">
                  5.631
                </p>
                <p className="text-[11px] text-slate-400 sm:text-xs">
                  {isPt ? "recursos" : "resources"}
                </p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-cyan-400 sm:text-2xl">
                  12
                </p>
                <p className="text-[11px] text-slate-400 sm:text-xs">
                  {isPt ? "domínios" : "domains"}
                </p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-cyan-400 sm:text-2xl">
                  100%
                </p>
                <p className="text-[11px] text-slate-400 sm:text-xs">
                  open source
                </p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-cyan-400 sm:text-2xl">
                  2
                </p>
                <p className="text-[11px] text-slate-400 sm:text-xs">
                  {isPt ? "idiomas" : "languages"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. COMMUNITY PREVIEW SECTION */}
        <section className="py-6 sm:py-10">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
              {isPt ? "POR DENTRO DA COMUNIDADE" : "INSIDE THE COMMUNITY"}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
              {isPt
                ? "Uma rede social para quem vive segurança"
                : "A social network for cybersecurity practitioners"}
            </h2>

            {/* TODO(backend): carregar post público em destaque via RPC/view pública caso RLS de topics permita leitura anônima */}
            <article className="mt-4 rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
                  I
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold text-emerald-400">
                      @ivymaia
                    </span>
                    <span className="inline-flex h-[18px] items-center rounded border border-indigo-500/40 bg-indigo-500/15 px-1.5 font-mono text-[10px] font-semibold uppercase text-indigo-300">
                      ADMIN
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    18 nov. ·{" "}
                    <span className="text-cyan-400">
                      {isPt ? "Inteligência de Ameaças" : "Threat Intelligence"}
                    </span>
                  </p>
                </div>
              </div>

              <h3 className="mt-3 text-base font-semibold text-slate-100">
                {isPt
                  ? "LeakIX, indexador de serviços e bancos expostos"
                  : "LeakIX, indexer for exposed services and databases"}
              </h3>

              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#070b14] p-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
                  L
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100">LeakIX</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="inline-flex h-[22px] items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 font-mono text-[11px] font-semibold text-emerald-400">
                      Freemium
                    </span>
                    <span className="inline-flex h-[22px] items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 font-mono text-[11px] font-semibold text-emerald-400">
                      {isPt ? "Sem cartão" : "No card required"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 px-1 py-1">
                  ▲ 12
                </span>
                <span className="inline-flex items-center gap-1.5 px-1 py-1">
                  💬 3
                </span>
                <Link
                  href="/register"
                  className="font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  {isPt ? "Entrar para interagir →" : "Join to interact →"}
                </Link>
              </div>
            </article>

            {/* Community Chips */}
            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {LANDING_COMMUNITIES.map((name) => (
                <Link
                  key={name}
                  href="/register"
                  className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-slate-800 bg-[#0d1322] px-4 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 3. HOW IT WORKS (3 Steps Side-by-Side) */}
        <section id="contribute" className="py-6 sm:py-10">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
              {dict.contributeSection.eyebrow}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
              {isPt ? "Como funciona a contribuição" : "How contribution works"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {isPt
                ? "Qualquer membro autenticado pode sugerir ferramentas e materiais."
                : "Any authenticated member can suggest tools and learning resources."}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-4">
              <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-3 text-center sm:p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400 font-mono text-sm font-bold text-cyan-400">
                  1
                </span>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">
                  {isPt ? "Envio" : "Submit"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isPt ? "Você sugere o recurso" : "Suggest a resource"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-3 text-center sm:p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-400 font-mono text-sm font-bold text-indigo-400">
                  2
                </span>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">
                  {isPt ? "Revisão" : "Review"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isPt ? "Moderadores avaliam" : "Moderators review"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-3 text-center sm:p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400 font-mono text-sm font-bold text-emerald-400">
                  3
                </span>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">
                  {isPt ? "Publicado" : "Published"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isPt ? "Entra no catálogo" : "Joins the catalog"}
                </p>
              </div>
            </div>

            {/* Ethical Use Block */}
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4 sm:p-5">
              <span className="mt-0.5 shrink-0 text-cyan-400" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                </svg>
              </span>
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {isPt
                    ? "USO ÉTICO E SEGURANÇA DEFENSIVA"
                    : "ETHICAL USE & DEFENSIVE SECURITY"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                  {dict.contributeSection.securityNote}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Compact Public Footer with Language Switcher */}
      <footer className="border-t border-slate-800/80 bg-[#050811] py-6">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Image
              src={siteConfig.logoHorizontalPath}
              alt={siteConfig.name}
              width={150}
              height={64}
              className="h-8 w-auto object-contain"
            />
            <div
              role="group"
              aria-label={dict.nav.languageLabel}
              className="flex items-center gap-1 rounded-full border border-slate-800 bg-[#0d1322] p-0.5"
            >
              <button
                type="button"
                onClick={() => setLocale("pt-BR")}
                aria-pressed={locale === "pt-BR"}
                className={`min-h-[36px] rounded-full px-3 font-mono text-xs font-semibold ${
                  locale === "pt-BR"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                PT-BR
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                aria-pressed={locale === "en"}
                className={`min-h-[36px] rounded-full px-3 font-mono text-xs font-semibold ${
                  locale === "en"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {isPt ? "PLATAFORMA" : "PLATFORM"}
              </p>
              <div className="mt-1 flex flex-col">
                <Link
                  href="/"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  {dict.nav.home}
                </Link>
                <Link
                  href="/catalog"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  {dict.nav.catalog}
                </Link>
                <Link
                  href="/forum"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  {dict.nav.forum}
                </Link>
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {isPt ? "COMUNIDADE" : "COMMUNITY"}
              </p>
              <div className="mt-1 flex flex-col">
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  {dict.nav.signIn}
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  {dict.nav.signUp}
                </Link>
                <a
                  href="https://github.com/IvyMaiaUx/vexor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  GitHub (Open Source)
                </a>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            © 2026 Vexor ·{" "}
            {isPt
              ? "Plataforma Comunitária Open Source de Cibersegurança."
              : "Open Source Cybersecurity Community Platform."}
          </p>
        </div>
      </footer>
    </div>
  );
}
