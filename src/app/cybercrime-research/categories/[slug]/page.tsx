"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { researchService } from "@/features/cybercrime-research/services/research-service";
import type { CaseStudy, ResearchArticle } from "@/features/cybercrime-research/types";
import { ResearchBreadcrumbs } from "@/features/cybercrime-research/components/research-breadcrumbs";
import { ResearchArticleDetailModal } from "@/features/cybercrime-research/components/research-article-detail-modal";
import { CaseStudyDetailModal } from "@/features/cybercrime-research/components/case-study-detail-modal";
import { ResearchAccessGuard } from "@/features/cybercrime-research/components/research-access-guard";
import { ResearchIcon } from "@/features/cybercrime-research/components/research-icon";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default function CategoryDetailPage({ params }: CategoryPageProps) {
  const { slug } = use(params);
  const { locale, setLocale } = useCatalogStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [selectedArticle, setSelectedArticle] = useState<ResearchArticle | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);

  const category = useMemo(() => researchService.getCategoryBySlug(slug), [slug]);

  // Aggregate content for this category
  const relatedArticles = useMemo(() => {
    return researchService
      .getAllArticles()
      .filter((a) => a.categories.includes(slug) || a.domain === slug);
  }, [slug]);

  const relatedCases = useMemo(() => {
    return researchService
      .getAllCaseStudies()
      .filter((cs) => cs.categories.includes(slug));
  }, [slug]);

  const relatedDiscussions = useMemo(() => {
    return researchService
      .getAllDiscussions()
      .filter((d) => d.category === slug);
  }, [slug]);

  const relatedLabs = useMemo(() => {
    return researchService
      .getAllLabGuides()
      .filter((l) => l.category === slug);
  }, [slug]);

  if (!category) {
    return (
      <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100">
        <Header locale={locale} onLocaleChange={setLocale} dict={dict} />
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4 rounded-3xl border border-slate-800 bg-[#0d1322] p-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-cyan-400">
              <ResearchIcon name="search" className="h-7 w-7" />
            </span>
            <h1 className="text-xl font-bold text-slate-100">
              {isPt ? "Categoria Não Encontrada" : "Category Not Found"}
            </h1>
            <p className="text-xs text-slate-400">
              {isPt
                ? "A taxonomia de pesquisa especificada não consta entre as 10 categorias oficiais do ecossistema Vexor."
                : "The specified research taxonomy does not exist among the 10 official Vexor classifications."}
            </p>
            <Link
              href="/cybercrime-research"
              className="inline-block rounded-xl bg-cyan-500 px-4 py-2 font-mono text-xs font-semibold text-slate-950 hover:bg-cyan-400"
            >
              ← {isPt ? "Voltar ao Portal" : "Back to Portal"}
            </Link>
          </div>
        </main>
        <Footer locale={locale} dict={dict} />
      </div>
    );
  }

  const catName = isPt ? category.name_pt : category.name_en;
  const catDesc = isPt ? category.description_pt : category.description_en;

  const totalContentCount =
    relatedArticles.length + relatedCases.length + relatedDiscussions.length + relatedLabs.length;

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-8 sm:py-12">
        <ResearchAccessGuard>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          <ResearchBreadcrumbs
            items={[
              { label: isPt ? "Categorias" : "Categories", href: "/cybercrime-research" },
              { label: catName },
            ]}
          />

          {/* Category Header Banner */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0d1322] p-6 sm:p-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-800 bg-slate-900 text-cyan-300 shrink-0">
                <ResearchIcon name={category.icon} className="h-10 w-10" />
              </span>

              <div className="space-y-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
                    {category.pillar === "both"
                      ? isPt ? "Investigação & Submundo" : "Investigation & Underground"
                      : category.pillar === "investigation"
                      ? isPt ? "Cybercrime Investigation" : "Cybercrime Investigation"
                      : isPt ? "Underground Intelligence" : "Underground Intelligence"}
                  </span>
                  <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-0.5 font-mono text-[10px] text-slate-300">
                    {category.slug}
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-4xl">
                  {catName}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {catDesc}
                </p>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800/80 font-mono text-xs">
              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">
                  {isPt ? "Artigos Técnicos" : "Articles"}
                </span>
                <span className="text-lg font-bold text-cyan-400">{relatedArticles.length}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">
                  {isPt ? "Estudos de Caso" : "Case Studies"}
                </span>
                <span className="text-lg font-bold text-indigo-400">{relatedCases.length}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">
                  {isPt ? "Debates da Comunidade" : "Discussions"}
                </span>
                <span className="text-lg font-bold text-purple-400">{relatedDiscussions.length}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">
                  {isPt ? "Roteiros de Lab" : "Lab Guides"}
                </span>
                <span className="text-lg font-bold text-emerald-400">{relatedLabs.length}</span>
              </div>
            </div>
          </section>

          {/* Related Research Articles */}
          {relatedArticles.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                  <ResearchIcon name="library" className="h-5 w-5 text-cyan-400 shrink-0" />
                  <span>{isPt ? "Artigos e Relatórios da Categoria" : "Category Research Articles"}</span>
                </h2>
                <Link
                  href="/cybercrime-research/library"
                  className="font-mono text-xs text-cyan-400 hover:underline"
                >
                  {isPt ? "Ver Todos na Biblioteca →" : "View All in Library →"}
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {relatedArticles.map((art) => {
                  const title = isPt ? art.title_pt : art.title_en;
                  const summary = isPt ? art.summary_pt : art.summary_en;

                  return (
                    <article
                      key={art.id}
                      className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">@{art.author}</span>
                          <span className="text-slate-500">{art.publishedAt}</span>
                        </div>
                        <h3 className="font-bold text-slate-100 hover:text-cyan-300 transition-colors">
                          {title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {summary}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-cyan-400 uppercase font-semibold">
                          {art.severity} • TLP:{art.tlp}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedArticle(art)}
                          className="font-mono text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                        >
                          {isPt ? "Ler Artigo" : "Read Article"} →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Related Case Studies */}
          {relatedCases.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                <ResearchIcon name="cases" className="h-5 w-5 text-indigo-400 shrink-0" />
                <span>{isPt ? "Estudos de Casos Reais Vinculados" : "Associated Real-World Case Studies"}</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {relatedCases.map((cs) => {
                  const title = isPt ? cs.title_pt : cs.title_en;
                  const summary = isPt ? cs.summary_pt : cs.summary_en;

                  return (
                    <article
                      key={cs.id}
                      className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-rose-300 font-bold">{cs.threatActor}</span>
                          <span className="text-slate-500">{cs.date}</span>
                        </div>
                        <h3 className="font-bold text-slate-100 hover:text-indigo-300 transition-colors">
                          {title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {summary}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-indigo-300 font-semibold">
                          {cs.timeline.length} {isPt ? "Fases Cronológicas" : "Phases"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCase(cs)}
                          className="font-mono text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          {isPt ? "Ver Autópsia" : "Inspect Autopsy"} →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Related Discussions */}
          {relatedDiscussions.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                <ResearchIcon name="discussions" className="h-5 w-5 text-purple-400 shrink-0" />
                <span>{isPt ? "Debates em Andamento" : "Ongoing Discussions"}</span>
              </h2>

              <div className="space-y-3">
                {relatedDiscussions.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0d1322] p-4 text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-slate-100 hover:text-purple-300 transition-colors">
                        <Link href="/forum">{isPt ? d.title_pt : d.title_en}</Link>
                      </h4>
                      <span className="font-mono text-[11px] text-slate-400">
                        @{d.author} • {d.repliesCount} {isPt ? "respostas" : "replies"}
                      </span>
                    </div>

                    <Link
                      href="/forum"
                      className="font-mono font-semibold text-purple-400 hover:underline shrink-0"
                    >
                      {isPt ? "Participar" : "Join"} →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty Fallback */}
          {totalContentCount === 0 && (
            <div className="rounded-3xl border border-slate-800 bg-[#0d1322]/50 p-12 text-center space-y-3">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-400">
                <ResearchIcon name="empty" className="h-6 w-6" />
              </span>
              <h3 className="text-base font-bold text-slate-200">
                {isPt ? "Nenhum conteúdo específico nesta categoria ainda" : "No content in this category yet"}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isPt
                  ? "Esta categoria está ativa e aguardando novas submissões da comunidade ou conclusões de investigações em andamento."
                  : "This category is active and accepting new community submissions or telemetry analysis."}
              </p>
              <Link
                href="/catalog/submit"
                className="inline-block rounded-xl bg-cyan-500 px-4 py-2 font-mono text-xs font-semibold text-slate-950 hover:bg-cyan-400"
              >
                + {isPt ? "Submeter Pesquisa" : "Submit Research"}
              </Link>
            </div>
          )}
        </div>
      </ResearchAccessGuard>
    </main>

      {/* Detail Modals */}
      <ResearchArticleDetailModal
        article={selectedArticle}
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        isPt={isPt}
      />

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
