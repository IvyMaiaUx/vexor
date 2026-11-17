"use client";

import { useMemo, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { researchService } from "@/features/cybercrime-research/services/research-service";
import type { AnalysisLabGuide } from "@/features/cybercrime-research/types";
import { ResearchBreadcrumbs } from "@/features/cybercrime-research/components/research-breadcrumbs";
import { LabGuideModal } from "@/features/cybercrime-research/components/lab-guide-modal";
import { ResearchAccessGuard } from "@/features/cybercrime-research/components/research-access-guard";

export default function AnalysisLabsPage() {
  const { locale, setLocale } = useCatalogStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [selectedGuide, setSelectedGuide] = useState<AnalysisLabGuide | null>(null);

  const allGuides = useMemo(() => researchService.getAllLabGuides(), []);

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-8 sm:py-12">
        <ResearchAccessGuard>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <ResearchBreadcrumbs
            items={[{ label: isPt ? "Laboratórios de Análise" : "Analysis Labs" }]}
          />

          {/* Banner */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0d1322] p-6 sm:p-8">
            <div className="max-w-3xl space-y-2">
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold">
                SANDBOXING & FORENSICS LABS • {allGuides.length} {isPt ? "Roteiros Homologados" : "Certified Playbooks"}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-4xl">
                {isPt ? "Laboratórios de Triagem & Segurança Operacional" : "Analysis Labs & Operational Security"}
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm leading-relaxed">
                {isPt
                  ? "Diretrizes metodológicas para dissecação e triagem de artefatos maliciosos em hipervisores isolados. Aprenda a configurar sandboxes defensivas mantendo rigoroso controle de OPSEC."
                  : "Methodological playbooks for safe specimen triage and reverse engineering inside isolated hypervisors. Maintain strict operational security while extracting threat telemetry."}
              </p>
            </div>
          </section>

          {/* OPSEC Pillars Warning Card */}
          <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="text-3xl p-2 rounded-2xl bg-amber-950/60 border border-amber-500/40 shrink-0">
                🛡️
              </span>
              <div className="space-y-2">
                <h2 className="text-base font-bold text-amber-200 sm:text-lg">
                  {isPt ? "Regras Universais de Isolamento Forense" : "Universal Forensic Isolation Principles"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-amber-200/90 pt-1">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">1.</span>
                    <span>{isPt ? "Hipervisores isolados com adaptadores Host-Only (zero conexão direta à rede física)." : "Host-Only isolated virtual network interfaces (zero physical bridge)."}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">2.</span>
                    <span>{isPt ? "Snapshots imutáveis limpos restaurados após cada sessão de execução." : "Clean immutable disk snapshots restored immediately after execution."}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">3.</span>
                    <span>{isPt ? "Desativação total de pastas compartilhadas e clipboard bidirecional." : "Total disablement of shared folders and bidirectional host-guest clipboards."}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">4.</span>
                    <span>{isPt ? "Cadeia de custódia com hash SHA-256 imediato de amostras e dumps de memória." : "Immediate cryptographic SHA-256 verification on all acquired artifacts."}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Labs List */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {allGuides.map((guide) => {
              const title = isPt ? guide.title_pt : guide.title_en;
              const summary = isPt ? guide.summary_pt : guide.summary_en;

              const levelBadge = {
                beginner: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                intermediate: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
                advanced: "border-rose-500/40 bg-rose-500/10 text-rose-300",
              }[guide.level];

              return (
                <article
                  key={guide.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-[#0d1322] p-6 hover:border-emerald-500/40 transition-all space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-3">
                      <span className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${levelBadge}`}>
                        {guide.level}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {guide.category}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-100 hover:text-emerald-300 transition-colors">
                      {title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {summary}
                    </p>

                    <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3 text-xs space-y-1">
                      <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">
                        {isPt ? "Ferramental Central:" : "Core Tooling:"}
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {guide.tools.map((t) => (
                          <span
                            key={t.name}
                            className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-200"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedGuide(guide)}
                      className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 font-mono text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 transition-colors"
                    >
                      {isPt ? "Acessar Roteiro Completo" : "Open Lab Playbook"} →
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </ResearchAccessGuard>
    </main>

      <LabGuideModal
        guide={selectedGuide}
        isOpen={Boolean(selectedGuide)}
        onClose={() => setSelectedGuide(null)}
        isPt={isPt}
      />

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
