"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { researchService } from "@/features/cybercrime-research/services/research-service";
import { ResearchBreadcrumbs } from "@/features/cybercrime-research/components/research-breadcrumbs";
import { ResearchAccessGuard } from "@/features/cybercrime-research/components/research-access-guard";
import { ResearchIcon } from "@/features/cybercrime-research/components/research-icon";

export default function TechnicalDiscussionsPage() {
  const { locale, setLocale } = useCatalogStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => researchService.getCategories(), []);
  const allDiscussions = useMemo(() => researchService.getAllDiscussions(), []);

  const filteredDiscussions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allDiscussions.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;

      const title = isPt ? item.title_pt : item.title_en;
      const body = isPt ? item.body_pt : item.body_en;

      return (
        title.toLowerCase().includes(q) ||
        body.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [allDiscussions, searchQuery, selectedCategory, isPt]);

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-8 sm:py-12">
        <ResearchAccessGuard>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <ResearchBreadcrumbs
            items={[{ label: isPt ? "Debates Técnicos" : "Technical Discussions" }]}
          />

          {/* Banner */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0d1322] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-3xl space-y-2">
                <span className="font-mono text-xs uppercase tracking-wider text-purple-400 font-bold">
                  SCIENTIFIC EXCHANGE • {filteredDiscussions.length} {isPt ? "Discussões Ativas" : "Active Discussions"}
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-4xl">
                  {isPt ? "Debates Técnicos em Cibercrime" : "Cybercrime Technical Discussions"}
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm leading-relaxed">
                  {isPt
                    ? "Espaço para colaboração técnica, hipóteses sobre novas campanhas de ameaça, validação defensiva e discussões científicas entre pesquisadores."
                    : "Collaborative threat hunting space for hypotheses on emerging campaigns, telemetry validation, and peer scientific review."}
                </p>
              </div>

              <Link
                href="/forum/new"
                className="rounded-xl bg-purple-500 px-5 py-2.5 text-center text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-colors hover:bg-purple-400 shrink-0"
              >
                + {isPt ? "Nova Discussão" : "Start Discussion"}
              </Link>
            </div>

            {/* Filter */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <div className="sm:col-span-2 lg:col-span-8">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isPt ? "Buscar debates por título, autor, técnica ou tag..." : "Search discussions by title, author, technique or tag..."}
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
                />
              </div>

              <div className="lg:col-span-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
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
            </div>
          </section>

          {/* Discussion List */}
          <section className="space-y-4">
            {filteredDiscussions.map((disc) => {
              const title = isPt ? disc.title_pt : disc.title_en;
              const body = isPt ? disc.body_pt : disc.body_en;

              return (
                <article
                  key={disc.id}
                  className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 hover:border-purple-500/40 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] text-purple-300 font-semibold">
                        {disc.category}
                      </span>
                      <span className="font-mono text-slate-400">
                        @{disc.author}
                      </span>
                      {disc.authorSpecialty && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300">
                          {disc.authorSpecialty}
                        </span>
                      )}
                    </div>

                    <span className="font-mono text-slate-500 text-[11px]">
                      {new Date(disc.lastActivityAt).toLocaleDateString(isPt ? "pt-BR" : "en-US", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-slate-100 hover:text-purple-300 transition-colors">
                    <Link href="/forum">{title}</Link>
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {body}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      {disc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 font-mono text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <ResearchIcon name="discussions" className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span>{disc.repliesCount} {isPt ? "respostas" : "replies"}</span>
                      </span>
                      <span className="flex items-center gap-1 text-cyan-400">
                        <span>▲</span>
                        <span>{disc.voteCount} {isPt ? "votos" : "votes"}</span>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </ResearchAccessGuard>
    </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
