"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { researchService } from "@/features/cybercrime-research/services/research-service";
import type { ResearchArticle } from "@/features/cybercrime-research/types";
import { ResearchArticleDetailModal } from "@/features/cybercrime-research/components/research-article-detail-modal";
import { ResearchSubmitModal } from "@/features/cybercrime-research/components/research-submit-modal";
import { ResearchAccessGuard } from "@/features/cybercrime-research/components/research-access-guard";
import { ResearchIcon } from "@/features/cybercrime-research/components/research-icon";

export default function CybercrimeResearchPortalPage() {
  const { locale, setLocale } = useCatalogStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [selectedArticle, setSelectedArticle] = useState<ResearchArticle | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const categories = useMemo(() => researchService.getCategories(), []);
  const pillars = useMemo(() => researchService.getPillars(), []);
  const articles = useMemo(() => {
    if (reloadKey < 0) return [];
    return researchService.getAllArticles();
  }, [reloadKey]);
  const caseStudies = useMemo(() => researchService.getAllCaseStudies(), []);
  const discussions = useMemo(() => researchService.getAllDiscussions(), []);
  const labs = useMemo(() => researchService.getAllLabGuides(), []);

  const t = dict.cybercrimeResearchPage;

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-8 sm:py-12">
        <ResearchAccessGuard>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 font-mono text-xs text-slate-400"
          >
            <Link
              href="/"
              className="transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400"
            >
              {dict.nav.home}
            </Link>
            <span aria-hidden="true" className="text-slate-600">
              /
            </span>
            <span aria-current="page" className="text-cyan-300 font-semibold">
              {t.title}
            </span>
          </nav>

          {/* Hero Banner Section */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-[#0d1322]/90 p-6 sm:p-10">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-3xl space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {t.eyebrow}
                </span>

                <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-4xl lg:text-5xl">
                  {t.title}
                </h1>

                <p className="text-xs leading-relaxed text-slate-300 sm:text-base">
                  {t.subtitle}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap lg:flex-col lg:items-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="rounded-xl bg-cyan-500 px-5 py-2.5 text-center text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400"
                >
                  {t.submitResearchCta}
                </button>
                <div className="flex items-center gap-2">
                  <Link
                    href="/cybercrime-research/library"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-center text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/20"
                  >
                    <ResearchIcon name="library" className="h-3.5 w-3.5 shrink-0" />
                    <span>{t.librarySpaceTitle}</span>
                  </Link>
                  <Link
                    href="/cybercrime-research/cases"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-center text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/25"
                  >
                    <ResearchIcon name="cases" className="h-3.5 w-3.5 shrink-0" />
                    <span>{t.casesSpaceTitle}</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 1: The Two Core Strategic Pillars */}
          <section className="space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-100 sm:text-2xl flex items-center gap-2.5">
                <ResearchIcon name="pillars" className="h-5 w-5 text-cyan-400 shrink-0" />
                <span>{t.pillarsTitle}</span>
              </h2>
              <p className="text-xs text-slate-400 sm:text-sm">
                {t.pillarsSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {pillars.map((pillar) => {
                const title = isPt ? pillar.title_pt : pillar.title_en;
                const subtitle = isPt ? pillar.subtitle_pt : pillar.subtitle_en;
                const desc = isPt ? pillar.description_pt : pillar.description_en;
                const topics = isPt ? pillar.topics_pt : pillar.topics_en;

                return (
                  <div
                    key={pillar.id}
                    className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-[#0d1322]/80 p-6 sm:p-8 hover:border-cyan-500/40 transition-all group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-800/40 bg-cyan-950/40 text-cyan-300 group-hover:scale-105 transition-transform shrink-0">
                          <ResearchIcon name={pillar.icon} className="h-6 w-6" />
                        </span>
                        <div>
                          <h3 className="text-lg font-bold text-slate-100 sm:text-xl group-hover:text-cyan-300 transition-colors">
                            {title}
                          </h3>
                          <p className="text-xs font-mono text-cyan-400">{subtitle}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed sm:text-sm">
                        {desc}
                      </p>

                      <div className="border-t border-slate-800/80 pt-4">
                        <h4 className="font-mono text-xs uppercase tracking-wider text-slate-400 mb-3">
                          {isPt ? "Áreas de Estudo & Investigação:" : "Core Focus Areas:"}
                        </h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                          {topics.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-cyan-400 font-bold shrink-0">›</span>
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: The Four Technical Spaces */}
          <section className="space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-100 sm:text-2xl flex items-center gap-2.5">
                <ResearchIcon name="spaces" className="h-5 w-5 text-cyan-400 shrink-0" />
                <span>{t.spacesTitle}</span>
              </h2>
              <p className="text-xs text-slate-400 sm:text-sm">
                {t.spacesSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Space 1: Research Library */}
              <Link
                href="/cybercrime-research/library"
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-6 hover:border-cyan-500/50 hover:bg-[#11192e] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                      <ResearchIcon name="library" className="h-4.5 w-4.5" />
                    </span>
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300 font-bold">
                      {articles.length} {isPt ? "Artigos" : "Articles"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                    {t.librarySpaceTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.librarySpaceDesc}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1 font-mono text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span>{t.exploreSpaceCta}</span>
                  <span>→</span>
                </div>
              </Link>

              {/* Space 2: Case Studies */}
              <Link
                href="/cybercrime-research/cases"
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-6 hover:border-indigo-500/50 hover:bg-[#11192e] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                      <ResearchIcon name="cases" className="h-4.5 w-4.5" />
                    </span>
                    <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] text-indigo-300 font-bold">
                      {caseStudies.length} {isPt ? "Casos" : "Cases"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {t.casesSpaceTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.casesSpaceDesc}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1 font-mono text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>{t.exploreSpaceCta}</span>
                  <span>→</span>
                </div>
              </Link>

              {/* Space 3: Technical Discussions */}
              <Link
                href="/cybercrime-research/discussions"
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-6 hover:border-purple-500/50 hover:bg-[#11192e] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
                      <ResearchIcon name="discussions" className="h-4.5 w-4.5" />
                    </span>
                    <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] text-purple-300 font-bold">
                      {discussions.length} {isPt ? "Tópicos" : "Topics"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                    {t.discussionsSpaceTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.discussionsSpaceDesc}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1 font-mono text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
                  <span>{t.exploreSpaceCta}</span>
                  <span>→</span>
                </div>
              </Link>

              {/* Space 4: Analysis Labs */}
              <Link
                href="/cybercrime-research/labs"
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-6 hover:border-emerald-500/50 hover:bg-[#11192e] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      <ResearchIcon name="labs" className="h-4.5 w-4.5" />
                    </span>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300 font-bold">
                      {labs.length} {isPt ? "Roteiros" : "Guides"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                    {t.labsSpaceTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.labsSpaceDesc}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1 font-mono text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>{t.exploreSpaceCta}</span>
                  <span>→</span>
                </div>
              </Link>
            </div>
          </section>

          {/* SECTION 3: The Ten Official Categories */}
          <section className="space-y-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-slate-100 sm:text-2xl flex items-center gap-2.5">
                  <ResearchIcon name="categories" className="h-5 w-5 text-cyan-400 shrink-0" />
                  <span>{t.categoriesTitle}</span>
                </h2>
                <p className="text-xs text-slate-400 sm:text-sm">
                  {t.categoriesSubtitle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {categories.map((cat) => {
                const name = isPt ? cat.name_pt : cat.name_en;
                const desc = isPt ? cat.description_pt : cat.description_en;

                return (
                  <Link
                    key={cat.id}
                    href={`/cybercrime-research/categories/${cat.slug}`}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322]/70 p-5 hover:border-cyan-500/40 hover:bg-[#11192e] transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-cyan-300 group-hover:border-cyan-500/30">
                          <ResearchIcon name={cat.icon} className="h-5 w-5" />
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 rounded-md bg-slate-800/80 px-2 py-0.5">
                          {cat.itemCount} {isPt ? "itens" : "items"}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-100 text-sm group-hover:text-cyan-300 transition-colors">
                        {name}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                        {desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 font-mono text-[11px] text-cyan-400 group-hover:underline">
                      {t.viewCategoryCta} →
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* SECTION 4: Ethical Charter & Operational Security Banner */}
          <section className="relative overflow-hidden rounded-3xl border border-cyan-800/50 bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-indigo-950/30 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-800/60 bg-cyan-950/60 text-cyan-300 shrink-0">
                <ResearchIcon name="shield" className="h-7 w-7" />
              </span>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-cyan-300 sm:text-lg">
                  {t.disclaimerTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {t.disclaimerBody}
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 5: Featured Peer-Reviewed Community Reports */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100 sm:text-2xl flex items-center gap-2.5">
                  <ResearchIcon name="featured" className="h-5 w-5 text-cyan-400 shrink-0" />
                  <span>{isPt ? "Destaques da Biblioteca" : "Featured Research"}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {isPt ? "Relatórios técnicos aprovados por moderadores e pesquisadores pares" : "Technical threat publications peer-reviewed by community moderators"}
                </p>
              </div>
              <Link
                href="/cybercrime-research/library"
                className="text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300"
              >
                {t.viewAllCta} ({articles.length}) →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {articles.slice(0, 4).map((art) => {
                const title = isPt ? art.title_pt : art.title_en;
                const summary = isPt ? art.summary_pt : art.summary_en;

                return (
                  <article
                    key={art.id}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-5 hover:border-cyan-500/40 hover:bg-[#11192e] transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-rose-300 font-bold uppercase">
                            {art.severity}
                          </span>
                          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300">
                            TLP:{art.tlp}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400">
                          ~{art.readTimeMinutes} min
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {title}
                      </h3>

                      <p className="line-clamp-2 text-xs text-slate-400 leading-relaxed">
                        {summary}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {art.attackTechniques.map((tech) => (
                          <span
                            key={tech}
                            className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] text-indigo-300"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                      <div className="font-mono text-slate-400">
                        @{art.author} • {art.publishedAt}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedArticle(art)}
                        className="font-mono font-semibold text-cyan-400 hover:text-cyan-300"
                      >
                        {t.readReport} →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </ResearchAccessGuard>
    </main>

      {/* Article Detail Inspection Modal */}
      <ResearchArticleDetailModal
        article={selectedArticle}
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        isPt={isPt}
      />

      {/* Submit Research Modal */}
      <ResearchSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitted={() => setReloadKey((k) => k + 1)}
        isPt={isPt}
      />

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
