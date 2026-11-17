"use client";

import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { researchService } from "@/features/cybercrime-research/services/research-service";
import type {
  ResearchArticle,
  ResearchSeverity,
  ResearchSubmissionDetail,
  ResearchSubmissionSummary,
  ResearchTlp,
} from "@/features/cybercrime-research/types";
import { ResearchBreadcrumbs } from "@/features/cybercrime-research/components/research-breadcrumbs";
import { ResearchArticleDetailModal } from "@/features/cybercrime-research/components/research-article-detail-modal";
import { ResearchSubmitModal } from "@/features/cybercrime-research/components/research-submit-modal";
import { ResearchAccessGuard } from "@/features/cybercrime-research/components/research-access-guard";
import { ReportButton } from "@/features/reports/report-modal";

const ITEMS_PER_PAGE = 6;

export default function ResearchLibraryPage() {
  const { locale, setLocale } = useCatalogStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedTlp, setSelectedTlp] = useState<ResearchTlp | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "readTime">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState<ResearchArticle | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [realSubmissions, setRealSubmissions] = useState<ResearchSubmissionSummary[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] =
    useState<ResearchSubmissionDetail | null>(null);
  const [selectedSubmissionRecipients, setSelectedSubmissionRecipients] = useState<
    Array<{ userId: string; username: string; justification: string | null }>
  >([]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setSubmissionsLoading(true);
      setSubmissionsError(null);
      const res = await researchService.listSubmissions(
        {
          query: searchQuery.trim() || undefined,
          severity:
            selectedSeverity !== "all" ? (selectedSeverity as ResearchSeverity) : undefined,
          tlp: selectedTlp !== "all" ? selectedTlp : undefined,
          sortBy,
        },
        1,
        12
      );
      if (!active) return;
      setSubmissionsLoading(false);
      if (!res.success || !res.data) {
        setRealSubmissions([]);
        setSubmissionsError(
          res.error ??
            (isPt
              ? "Não foi possível carregar as submissões de pesquisa."
              : "Unable to load community research submissions.")
        );
        return;
      }
      setRealSubmissions(res.data.items);
    });
    return () => {
      active = false;
    };
  }, [searchQuery, selectedSeverity, selectedTlp, sortBy, reloadKey, isPt]);

  const categories = useMemo(() => researchService.getCategories(), []);
  const allArticles = useMemo(() => {
    if (reloadKey < 0) return [];
    return researchService.getAllArticles();
  }, [reloadKey]);

  // Filter and sort logic
  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = allArticles.filter((item) => {
      if (selectedCategory !== "all" && !item.categories.includes(selectedCategory) && item.domain !== selectedCategory) {
        return false;
      }
      if (selectedSeverity !== "all" && item.severity !== selectedSeverity) {
        return false;
      }
      if (!q) return true;

      const title = isPt ? item.title_pt : item.title_en;
      const summary = isPt ? item.summary_pt : item.summary_en;

      return (
        title.toLowerCase().includes(q) ||
        summary.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.attackTechniques.some((t) => t.toLowerCase().includes(q)) ||
        (item.cves && item.cves.some((c) => c.toLowerCase().includes(q)))
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      }
      if (sortBy === "title") {
        const titleA = isPt ? a.title_pt : a.title_en;
        const titleB = isPt ? b.title_pt : b.title_en;
        return titleA.localeCompare(titleB);
      }
      if (sortBy === "readTime") {
        return a.readTimeMinutes - b.readTimeMinutes;
      }
      return 0;
    });
  }, [allArticles, searchQuery, selectedCategory, selectedSeverity, sortBy, isPt]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedArticles = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE;
    return filteredArticles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArticles, validPage]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedSeverity("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-8 sm:py-12">
        <ResearchAccessGuard>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <ResearchBreadcrumbs
            items={[{ label: isPt ? "Biblioteca de Pesquisa" : "Research Library" }]}
          />

          {/* Header Banner */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0d1322] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="max-w-3xl space-y-2">
                <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold">
                  RESEARCH LIBRARY • {filteredArticles.length} {isPt ? "Artigos Encontrados" : "Articles Found"}
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-4xl">
                  {isPt ? "Biblioteca Técnica de Pesquisa" : "Technical Research Library"}
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm leading-relaxed">
                  {isPt
                    ? "Repositório central de artigos técnicos, triagem de malware, mapeamento de TTPs e estudos sobre cibercrime revisados pela comunidade."
                    : "Central peer-reviewed archive of technical threat reports, malware triage, ATT&CK mapping, and cybercrime intelligence."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="rounded-xl bg-cyan-500 px-4 py-2.5 font-mono text-xs font-semibold text-slate-950 hover:bg-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-colors"
              >
                + {isPt ? "Submeter Pesquisa" : "Submit Research"}
              </button>
            </div>

            {/* Filter Bar */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <div className="sm:col-span-2 lg:col-span-5">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={dict.cybercrimeResearchPage.searchPlaceholder}
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
                />
              </div>

              <div className="lg:col-span-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2.5 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
                >
                  <option value="all">{isPt ? "Todas as Categorias" : "All Categories"}</option>
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {isPt ? cat.name_pt : cat.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={selectedSeverity}
                  onChange={(e) => {
                    setSelectedSeverity(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2.5 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
                >
                  <option value="all">{isPt ? "Severidade: Todas" : "Severity: All"}</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "newest" | "oldest" | "title" | "readTime"
                    )
                  }
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2.5 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
                >
                  <option value="newest">{isPt ? "Mais Recentes" : "Newest"}</option>
                  <option value="oldest">{isPt ? "Mais Antigos" : "Oldest"}</option>
                  <option value="title">{isPt ? "Título (A-Z)" : "Title (A-Z)"}</option>
                  <option value="readTime">{isPt ? "Tempo de Leitura" : "Read Time"}</option>
                </select>
                <select
                  value={selectedTlp}
                  onChange={(e) => {
                    setSelectedTlp(e.target.value as ResearchTlp | "all");
                    setCurrentPage(1);
                  }}
                  aria-label="TLP Filter"
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2.5 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
                >
                  <option value="all">TLP: {isPt ? "Todos" : "All"}</option>
                  <option value="CLEAR">TLP:CLEAR</option>
                  <option value="GREEN">TLP:GREEN</option>
                  <option value="AMBER">TLP:AMBER</option>
                  <option value="AMBER+">TLP:AMBER+</option>
                  <option value="RED">TLP:RED</option>
                </select>
              </div>
            </div>
          </section>

          {/* Submissões Reais da Comunidade */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-100">
                {isPt ? "Submissões da Comunidade" : "Community Research Submissions"}
              </h2>
              <span className="font-mono text-xs text-slate-400">
                {realSubmissions.length} {isPt ? "itens acessíveis" : "accessible items"}
              </span>
            </div>

            {submissionsLoading ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/60 p-6 text-xs text-slate-400">
                {isPt ? "Carregando pesquisas autorizadas..." : "Loading authorized research..."}
              </div>
            ) : submissionsError ? (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-5 text-xs text-rose-300">
                {submissionsError}
              </div>
            ) : realSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/60 p-6 text-xs text-slate-400">
                {isPt
                  ? "Nenhuma submissão de pesquisa encontrada para os filtros e permissões TLP atuais."
                  : "No research submissions found for the current filters and TLP permissions."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {realSubmissions.map((sub) => (
                  <article
                    key={sub.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-5 space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                          TLP:{sub.tlp}
                        </span>
                        <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-300">
                          {sub.severity}
                        </span>
                        <span className="rounded border border-slate-800 bg-[#070b14] px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          {sub.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-100">
                        {isPt ? sub.titlePt : sub.titleEn || sub.titlePt}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-3">
                        {isPt ? sub.summaryPt : sub.summaryEn || sub.summaryPt}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800/70 pt-3 text-xs">
                      <span className="font-mono text-slate-400">@{sub.authorUsername}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const detail = await researchService.getSubmissionDetail(sub.id);
                            if (detail.success && detail.data) {
                              setSelectedSubmissionDetail(detail.data.item);
                              setSelectedSubmissionRecipients(
                                detail.data.recipients.map((r) => ({
                                  userId: r.userId,
                                  username: r.username,
                                  justification: r.justification,
                                }))
                              );
                            } else {
                              setSubmissionsError(detail.error ?? "Unable to open submission.");
                            }
                          }}
                          className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
                        >
                          {isPt ? "Detalhes" : "Details"}
                        </button>
                        <ReportButton
                          targetType="research"
                          targetId={sub.id}
                          locale={locale}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Editorial Articles Grid */}
          <section>
            {filteredArticles.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/60 p-12 text-center space-y-3">
                <p className="text-sm text-slate-400">
                  {isPt
                    ? "Nenhum artigo encontrado com os filtros selecionados."
                    : "No research articles found matching the current filters."}
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-slate-700 bg-[#070b14] px-4 py-2 text-xs font-semibold text-cyan-300 hover:border-cyan-500/50"
                >
                  {isPt ? "Redefinir Filtros" : "Reset Filters"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paginatedArticles.map((art) => {
                  const title = isPt ? art.title_pt : art.title_en;
                  const summary = isPt ? art.summary_pt : art.summary_en;

                  const severityBadge = {
                    critical: "border-rose-500/40 bg-rose-500/10 text-rose-300",
                    high: "border-amber-500/40 bg-amber-500/10 text-amber-300",
                    medium: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
                    info: "border-slate-700 bg-slate-800 text-slate-300",
                  }[art.severity];

                  return (
                    <article
                      key={art.id}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-5 hover:border-cyan-500/40 hover:bg-[#11192e] transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 text-xs">
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className={`rounded border px-2 py-0.5 font-bold uppercase ${severityBadge}`}>
                              {art.severity}
                            </span>
                            <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300">
                              TLP:{art.tlp}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">
                            ~{art.readTimeMinutes} min
                          </span>
                        </div>

                        <h2 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2">
                          {title}
                        </h2>

                        <p className="line-clamp-3 text-xs text-slate-400 leading-relaxed">
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
                        <div className="font-mono text-slate-400 text-[11px]">
                          @{art.author} • {art.publishedAt}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedArticle(art)}
                          className="font-mono font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          {isPt ? "Ler Artigo" : "Read Article"} →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 py-1.5 font-mono text-xs text-slate-300 hover:border-slate-700 disabled:opacity-40"
              >
                ← {isPt ? "Anterior" : "Previous"}
              </button>
              <span className="font-mono text-xs text-slate-400 px-3">
                {validPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 py-1.5 font-mono text-xs text-slate-300 hover:border-slate-700 disabled:opacity-40"
              >
                {isPt ? "Próxima" : "Next"} →
              </button>
            </div>
          )}
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

      {selectedSubmissionDetail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-800 bg-[#0b101d] p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                    TLP:{selectedSubmissionDetail.tlp}
                  </span>
                  <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                    {selectedSubmissionDetail.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-100">
                  {isPt
                    ? selectedSubmissionDetail.titlePt
                    : selectedSubmissionDetail.titleEn || selectedSubmissionDetail.titlePt}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmissionDetail(null)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap">
              {isPt
                ? selectedSubmissionDetail.bodyPt
                : selectedSubmissionDetail.bodyEn || selectedSubmissionDetail.bodyPt}
            </p>
            {selectedSubmissionRecipients.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-[#050811] p-3 space-y-1">
                <span className="font-mono text-[11px] font-semibold text-cyan-300">
                  {isPt ? "Destinatários TLP Autorizados:" : "Authorized TLP Recipients:"}
                </span>
                <p className="font-mono text-xs text-slate-300">
                  {selectedSubmissionRecipients.map((r) => `@${r.username}`).join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
