"use client";

import { useMemo, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { researchService } from "@/features/cybercrime-research/services/research-service";
import type { CaseStudy } from "@/features/cybercrime-research/types";
import { ResearchBreadcrumbs } from "@/features/cybercrime-research/components/research-breadcrumbs";
import { CaseStudyDetailModal } from "@/features/cybercrime-research/components/case-study-detail-modal";
import { ResearchAccessGuard } from "@/features/cybercrime-research/components/research-access-guard";

export default function CaseStudiesPage() {
  const { locale, setLocale } = useCatalogStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);

  const allCases = useMemo(() => researchService.getAllCaseStudies(), []);

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allCases;

    return allCases.filter((item) => {
      const title = isPt ? item.title_pt : item.title_en;
      const summary = isPt ? item.summary_pt : item.summary_en;
      const context = isPt ? item.context_pt : item.context_en;

      return (
        title.toLowerCase().includes(q) ||
        summary.toLowerCase().includes(q) ||
        context.toLowerCase().includes(q) ||
        item.threatActor.toLowerCase().includes(q) ||
        item.iocs.some((i) => i.value.toLowerCase().includes(q)) ||
        item.ttps.some((t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
      );
    });
  }, [allCases, searchQuery, isPt]);

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-8 sm:py-12">
        <ResearchAccessGuard>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <ResearchBreadcrumbs
            items={[{ label: isPt ? "Estudos de Casos Criminais" : "Cybercrime Case Studies" }]}
          />

          {/* Header Banner */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0d1322] p-6 sm:p-8">
            <div className="max-w-3xl space-y-2">
              <span className="font-mono text-xs uppercase tracking-wider text-indigo-400 font-bold">
                INCIDENT AUTOPSY • {filteredCases.length} {isPt ? "Casos Documentados" : "Documented Cases"}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-4xl">
                {isPt ? "Estudos de Casos Reais de Cibercrime" : "Real-World Cybercrime Case Studies"}
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm leading-relaxed">
                {isPt
                  ? "Análise forense e reconstrução cronológica de incidentes reais. Estude os vetores de acesso inicial, movimentação lateral, impacto e medidas preventivas."
                  : "Forensic post-mortems and chronological attack reconstructions. Examine initial access vectors, lateral movement, real-world impact, and defensive mitigations."}
              </p>
            </div>

            {/* Search */}
            <div className="mt-6 max-w-md">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isPt ? "Buscar por ator de ameaça, setor, IoC ou técnica..." : "Search by threat actor, sector, IoC, or technique..."}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
              />
            </div>
          </section>

          {/* Cases List */}
          <section className="space-y-6">
            {filteredCases.map((cs) => {
              const title = isPt ? cs.title_pt : cs.title_en;
              const summary = isPt ? cs.summary_pt : cs.summary_en;
              const sector = isPt ? cs.targetSector_pt : cs.targetSector_en;
              const initialVector = isPt ? cs.initialVector_pt : cs.initialVector_en;

              return (
                <article
                  key={cs.id}
                  className="rounded-3xl border border-slate-800 bg-[#0d1322] p-6 hover:border-indigo-500/40 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-rose-300">
                        {cs.threatActor}
                      </span>
                      <span className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                        {sector}
                      </span>
                      {cs.isDemonstrative && (
                        <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                          {isPt ? "Demonstrativo" : "Demonstrative"}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-slate-400 text-xs">
                      {cs.date}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-100 hover:text-cyan-300 transition-colors">
                      {title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {summary}
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-800/80 bg-[#070b14]/70 p-4 text-xs">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                        {isPt ? "Vetor Inicial" : "Initial Vector"}
                      </span>
                      <p className="text-slate-200 line-clamp-2">{initialVector}</p>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-indigo-400 block mb-1">
                        {isPt ? "Fases da Cronologia" : "Timeline Phases"}
                      </span>
                      <p className="font-mono text-indigo-300 font-semibold">
                        {cs.timeline.length} {isPt ? "etapas mapeadas" : "phases reconstructed"}
                      </p>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 block mb-1">
                        {isPt ? "IoCs Catalogados" : "Indexed IoCs"}
                      </span>
                      <p className="font-mono text-emerald-300 font-semibold">
                        {cs.iocs.length} {isPt ? "indicadores extraídos" : "extracted indicators"}
                      </p>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-wrap gap-1.5">
                      {cs.ttps.map((ttp) => (
                        <span
                          key={ttp.id}
                          className="rounded border border-slate-700 bg-slate-800/60 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                        >
                          {ttp.id}: {ttp.name}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCase(cs)}
                      className="rounded-xl bg-indigo-500/20 border border-indigo-500/40 px-4 py-2 font-mono text-xs font-semibold text-indigo-200 hover:bg-indigo-500/30 transition-colors shrink-0"
                    >
                      {isPt ? "Examinar Autópsia Completa" : "Inspect Case Autopsy"} →
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </ResearchAccessGuard>
    </main>

      <CaseStudyDetailModal
        caseStudy={selectedCase}
        isOpen={Boolean(selectedCase)}
        onClose={() => setSelectedCase(null)}
        isPt={isPt}
      />

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
