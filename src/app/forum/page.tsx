"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Pagination } from "@/features/catalog/pagination";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import {
  fetchForumTags,
  type ForumSortBy,
  type ForumTabFilter,
  type ForumTagItem,
  type ForumTopicItem,
  queryForumTopics,
} from "@/features/forum/forum-service";
import { TopicCard } from "@/features/forum/topic-card";
import { useForumStore } from "@/features/forum/use-forum-store";
import { getDictionary } from "@/lib/i18n/dictionaries";

const TOPICS_PER_PAGE = 8;

function ForumContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, setLocale } = useCatalogStore();
  const { categories, categoriesLoading } = useForumStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const searchQuery = searchParams?.get("q") ?? "";
  const selectedCategory = searchParams?.get("category") ?? "all";
  const selectedTag = searchParams?.get("tag") ?? "";
  const rawTab = searchParams?.get("tab") ?? "all";
  const activeTab: ForumTabFilter =
    rawTab === "unanswered" || rawTab === "solved" ? rawTab : "all";
  const sortBy: ForumSortBy =
    searchParams?.get("sort") === "newest" ? "newest" : "activity";

  const rawPage = parseInt(searchParams?.get("page") ?? "1", 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const [topics, setTopics] = useState<ForumTopicItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tags, setTags] = useState<ForumTagItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");

  const currentQueryKey = `${searchQuery}|${selectedCategory}|${selectedTag}|${activeTab}|${sortBy}|${currentPage}|${categories.length}|${retryToken}`;
  const isLoading = categoriesLoading || loadedKey !== currentQueryKey;

  useEffect(() => {
    let cancelled = false;
    void fetchForumTags().then((res) => {
      if (!cancelled && res.status === "success") {
        setTags(res.tags);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (categoriesLoading) {
      return;
    }

    let cancelled = false;

    void queryForumTopics(
      {
        search: searchQuery,
        categorySlug: selectedCategory,
        tag: selectedTag,
        tab: activeTab,
        sortBy,
        page: currentPage,
        pageSize: TOPICS_PER_PAGE,
      },
      { categories }
    ).then((res) => {
      if (cancelled) {
        return;
      }
      if (res.status === "success") {
        setTopics(res.items);
        setTotalItems(res.totalCount);
        setTotalPages(res.totalPages);
        setErrorMessage(null);
      } else {
        setTopics([]);
        setTotalItems(0);
        setTotalPages(1);
        setErrorMessage(
          res.errorMessage ??
            (locale === "pt-BR"
              ? "Não foi possível carregar as discussões do fórum."
              : "Could not load forum discussions.")
        );
      }
      setLoadedKey(currentQueryKey);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    categories,
    categoriesLoading,
    currentPage,
    currentQueryKey,
    locale,
    searchQuery,
    selectedCategory,
    selectedTag,
    sortBy,
  ]);

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const current = new URLSearchParams(searchParams?.toString() ?? "");
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all" || value === "") {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });
      if (resetPage) {
        current.delete("page");
      }
      const qs = current.toString();
      router.replace(qs ? `/forum?${qs}` : "/forum", { scroll: false });
    },
    [router, searchParams]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.slug, c])),
    [categories]
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const handlePageChange = (nextPage: number) => {
    updateUrlParams({ page: nextPage > 1 ? String(nextPage) : null }, false);
    if (typeof window !== "undefined") {
      const el = document.getElementById("topics-list");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== "all" ||
    Boolean(selectedTag) ||
    activeTab !== "all" ||
    sortBy !== "activity";

  const resetFilters = () => {
    router.replace("/forum", { scroll: false });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b border-slate-800/80 bg-cyber-grid py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  {dict.forumPage.eyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
                  {dict.forumPage.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                  {dict.forumPage.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/forum/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400"
                >
                  + {dict.forumPage.newTopicCta}
                </Link>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="mt-8 rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-3.5 shadow-xl sm:p-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 lg:gap-3">
                <div className="relative sm:col-span-2 lg:col-span-8">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) =>
                      updateUrlParams({ q: e.target.value.trim() || null })
                    }
                    placeholder={dict.forumPage.searchPlaceholder}
                    aria-label={dict.forumPage.searchPlaceholder}
                    className="w-full rounded-xl border border-slate-800 bg-[#070b14] py-2.5 pl-10 pr-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) =>
                      updateUrlParams({ category: e.target.value })
                    }
                    aria-label={dict.forumPage.allCategories}
                    className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2.5 text-base text-slate-200 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                  >
                    <option value="all">{dict.forumPage.allCategories}</option>
                    {categories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {locale === "pt-BR" ? cat.name_pt : cat.name_en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabs: All/Activity, Newest, Solved, Unanswered */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateUrlParams({ tab: null, sort: null })
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === "all" && sortBy === "activity"
                        ? "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {dict.forumPage.sortLatest}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateUrlParams({ tab: null, sort: "newest" })
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === "all" && sortBy === "newest"
                        ? "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {locale === "pt-BR" ? "Mais novos" : "Newest"}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateUrlParams({ tab: "solved" })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === "solved"
                        ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    ✓ {dict.forumPage.sortSolved}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateUrlParams({ tab: "unanswered" })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === "unanswered"
                        ? "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {dict.forumPage.sortUnanswered}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-400">
                    {dict.forumPage.resultsCount(totalItems)}
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-lg border border-slate-700 bg-[#070b14] px-2.5 py-1 text-xs font-medium text-cyan-300 hover:border-cyan-500/40"
                    >
                      {dict.forumPage.clearFilters}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Popular Tags Quick Strip */}
            {tags.length > 0 && (
              <div className="no-scrollbar mt-4 flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="font-mono text-[11px] text-slate-500">
                  Tags:
                </span>
                {tags.map((tag) => {
                  const isSelected = selectedTag === tag.slug;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        updateUrlParams({
                          tag: isSelected ? null : tag.slug,
                        })
                      }
                      className={`shrink-0 rounded-md border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                        isSelected
                          ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-300"
                          : "border-slate-800 bg-[#0d1322] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      #{tag.slug}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Topics List & Pagination */}
        <section id="topics-list" className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {errorMessage && (
              <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/25 p-4 sm:flex-row sm:items-center">
                <p className="text-xs font-medium text-rose-200">
                  {errorMessage}
                </p>
                <button
                  type="button"
                  onClick={() => setRetryToken((t) => t + 1)}
                  className="self-start rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 font-mono text-xs font-semibold text-rose-100 hover:bg-rose-500/30 sm:self-auto"
                >
                  {locale === "pt-BR" ? "Tentar novamente" : "Retry"}
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3.5" aria-busy="true">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl border border-slate-800/80 bg-[#0d1322]/70"
                  />
                ))}
              </div>
            ) : topics.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/80 p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-[#070b14] text-xl text-slate-500">
                  💬
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-100 sm:text-xl">
                  {hasActiveFilters
                    ? dict.forumPage.noTopicsFound
                    : locale === "pt-BR"
                      ? "Ainda não existem discussões nesta categoria. Seja o primeiro a compartilhar conhecimento com a comunidade."
                      : "There are no discussions in this category yet. Be the first to share knowledge with the community."}
                </h2>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-xl border border-slate-700 bg-[#0d1322] px-4 py-2 text-xs font-semibold text-cyan-300 hover:border-cyan-500/40"
                    >
                      {dict.forumPage.clearFilters}
                    </button>
                  )}
                  <Link
                    href="/forum/new"
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    + {dict.forumPage.newTopicCta}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3.5">
                  {topics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      category={categoryMap.get(topic.categorySlug)}
                      locale={locale}
                      dict={dict}
                      onTagClick={(tag) => updateUrlParams({ tag })}
                    />
                  ))}
                </div>

                <div className="mt-8">
                  <Pagination
                    currentPage={safeCurrentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    dict={dict.pagination}
                    totalCount={totalItems}
                    pageSize={TOPICS_PER_PAGE}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}

function ForumLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b14] font-mono text-xs text-slate-400">
      Loading forum...
    </div>
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={<ForumLoadingFallback />}>
      <ForumContent />
    </Suspense>
  );
}
