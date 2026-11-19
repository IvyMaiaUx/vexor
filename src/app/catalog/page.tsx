"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type {
  DifficultyLevel,
  ResourceLanguage,
  ResourceType,
} from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  type CatalogResourceItem,
  queryCatalogResources,
} from "@/features/catalog/catalog-service";
import { Pagination } from "@/features/catalog/pagination";
import { ResourceCard } from "@/features/catalog/resource-card";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";

const RESOURCE_TYPE_KEYS: ResourceType[] = [
  "tool",
  "repository",
  "script",
  "framework",
  "documentation",
  "lab",
  "ctf_platform",
  "course",
  "article",
];

const DIFFICULTY_KEYS: DifficultyLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

const LANGUAGE_KEYS: ResourceLanguage[] = [
  "en",
  "pt-BR",
  "multilingual",
  "other",
];

const ITEMS_PER_PAGE = 9;
const AI_CATEGORY_SLUG = "ai-security";
type CatalogTab = "all" | "resources" | "ai";

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    locale,
    setLocale,
    categories,
    categoriesLoading,
    bookmarkedIds,
    bookmarkedSlugs,
    bookmarkError,
    dismissBookmarkError,
    toggleBookmark,
  } = useCatalogStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  // Read query params as single source of truth for shareable URLs
  const rawTab = searchParams?.get("tab");
  const activeTab: CatalogTab =
    rawTab === "resources" || rawTab === "ai" ? rawTab : "all";
  const searchQuery = searchParams?.get("q") ?? "";
  const selectedCategory = searchParams?.get("category") ?? "all";
  const effectiveCategory =
    activeTab === "ai" ? AI_CATEGORY_SLUG : selectedCategory;
  const excludeCategory =
    activeTab === "resources" && selectedCategory === "all"
      ? AI_CATEGORY_SLUG
      : undefined;
  const selectedType = searchParams?.get("type") ?? "all";
  const selectedDifficulty = searchParams?.get("difficulty") ?? "all";
  const selectedLanguage =
    searchParams?.get("language") ?? searchParams?.get("lang") ?? "all";
  const onlyBookmarks =
    searchParams?.get("bookmarks") === "true" ||
    searchParams?.get("bookmarks") === "1";
  const sortBy =
    searchParams?.get("sort") === "alphabetical" ? "alphabetical" : "newest";

  const rawPage = parseInt(searchParams?.get("page") ?? "1", 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const [items, setItems] = useState<CatalogResourceItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loadedKey, setLoadedKey] = useState<string>("");
  const [queryError, setQueryError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const currentQueryKey = `${activeTab}|${searchQuery}|${effectiveCategory}|${excludeCategory ?? ""}|${selectedType}|${selectedDifficulty}|${selectedLanguage}|${onlyBookmarks}|${bookmarkedIds.join(",")}|${sortBy}|${currentPage}|${reloadNonce}|${categories.length}`;
  const isLoading = categoriesLoading || loadedKey !== currentQueryKey;

  // Helper to push updated search parameters to the URL
  const updateUrlParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const current = new URLSearchParams(searchParams?.toString() ?? "");

      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all" || value === "false") {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });

      if (resetPage) {
        current.delete("page");
      }

      const qs = current.toString();
      router.replace(qs ? `/catalog?${qs}` : "/catalog", { scroll: false });
    },
    [router, searchParams]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.slug, c])),
    [categories]
  );

  useEffect(() => {
    if (categoriesLoading) {
      return;
    }

    let cancelled = false;

    void queryCatalogResources(
      {
        search: searchQuery,
        categorySlug: effectiveCategory,
        excludeCategorySlug: excludeCategory,
        type: selectedType as ResourceType | "all",
        difficulty: selectedDifficulty as DifficultyLevel | "all",
        language: selectedLanguage as ResourceLanguage | "all",
        onlyBookmarks,
        bookmarkedIds,
        sortBy,
        page: currentPage,
        pageSize: ITEMS_PER_PAGE,
      },
      { categories }
    ).then((res) => {
      if (cancelled) {
        return;
      }
      if (res.status === "error") {
        setItems([]);
        setTotalItems(0);
        setTotalPages(1);
        setQueryError(
          res.errorMessage ||
            (isPt
              ? "Não foi possível carregar os recursos do catálogo."
              : "Could not load catalog resources.")
        );
      } else {
        setQueryError(null);
        setItems(res.items);
        setTotalItems(res.totalCount);
        setTotalPages(res.totalPages);
      }
      setLoadedKey(currentQueryKey);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    bookmarkedIds,
    categories,
    categoriesLoading,
    currentPage,
    currentQueryKey,
    effectiveCategory,
    excludeCategory,
    isPt,
    onlyBookmarks,
    reloadNonce,
    searchQuery,
    selectedDifficulty,
    selectedLanguage,
    selectedType,
    sortBy,
  ]);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedResources = items;

  const handlePageChange = (nextPage: number) => {
    updateUrlParams({ page: nextPage > 1 ? String(nextPage) : null }, false);
    // Smooth scroll to catalog grid
    if (typeof window !== "undefined") {
      const el = document.getElementById("catalog-grid");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const hasActiveFilters =
    activeTab !== "all" ||
    Boolean(searchQuery.trim()) ||
    selectedCategory !== "all" ||
    selectedType !== "all" ||
    selectedDifficulty !== "all" ||
    selectedLanguage !== "all" ||
    onlyBookmarks;

  const handleTabChange = (nextTab: CatalogTab) => {
    if (nextTab === "all") {
      updateUrlParams({
        tab: null,
        category: selectedCategory === AI_CATEGORY_SLUG ? null : selectedCategory,
      });
      return;
    }
    if (nextTab === "resources") {
      updateUrlParams({
        tab: "resources",
        category: selectedCategory === AI_CATEGORY_SLUG ? null : selectedCategory,
      });
      return;
    }
    updateUrlParams({
      tab: "ai",
      category: null,
    });
  };

  const visibleCategories = useMemo(() => {
    if (activeTab === "resources") {
      return categories.filter((c) => c.slug !== AI_CATEGORY_SLUG);
    }
    if (activeTab === "ai") {
      return categories.filter((c) => c.slug === AI_CATEGORY_SLUG);
    }
    return categories;
  }, [activeTab, categories]);

  const resetFilters = () => {
    router.replace("/catalog", { scroll: false });
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
                  {dict.catalogSection.eyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
                  {dict.catalogSection.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                  {dict.catalogSection.subtitle}
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
                <button
                  type="button"
                  onClick={() =>
                    updateUrlParams({
                      bookmarks: onlyBookmarks ? null : "true",
                    })
                  }
                  aria-pressed={onlyBookmarks}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
                    onlyBookmarks
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                      : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-cyan-500/40"
                  }`}
                >
                  <span aria-hidden="true">{onlyBookmarks ? "★" : "☆"}</span>
                  {dict.catalogSection.onlyBookmarks} ({bookmarkedSlugs.length})
                </button>

                <Link
                  href="/catalog/bookmarks"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0d1322] px-4 py-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                >
                  ★ {dict.bookmarksPage.title}
                </Link>

                <Link
                  href="/catalog/submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400"
                >
                  + {dict.nav.submitResource}
                </Link>
              </div>
            </div>

            {/* Catalog Top Tabs */}
            <div
              role="tablist"
              aria-label={isPt ? "Abas do catálogo" : "Catalog tabs"}
              className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3 sm:mt-8"
            >
              {(
                [
                  {
                    id: "all",
                    label: isPt ? "Tudo" : "All",
                  },
                  {
                    id: "resources",
                    label: isPt ? "Ferramentas & Recursos" : "Tools & Resources",
                  },
                  {
                    id: "ai",
                    label: isPt ? "IAs & Modelos" : "AI & Models",
                  },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleTabChange(tab.id)}
                    className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.15)]"
                        : "border-slate-800 bg-[#0d1322]/70 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "ai" && (
              <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                    {isPt
                      ? "IAs & Modelos · Open-Weight, Local & Pesquisa"
                      : "AI & Models · Open-Weight, Local & Research"}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {isPt
                      ? "Espaço dedicado a modelos open-weight, execução local/self-hosted sem restrições comerciais e ferramentas de IA para pesquisa defensiva, Red Team autorizado e laboratório."
                      : "Dedicated space for open-weight models, local/self-hosted execution without commercial API filters, and AI tools for defensive research, authorized Red Teaming, and lab analysis."}
                  </p>
                </div>
                <Link
                  href="/catalog/submit"
                  className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-center font-mono text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25"
                >
                  + {isPt ? "Divulgar IA / Modelo" : "Submit AI / Model"}
                </Link>
              </div>
            )}

            {/* Search & Multi-Filter Panel */}
            <div className="mt-4 rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-3.5 shadow-xl sm:p-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 lg:gap-3">
                <div className="relative sm:col-span-2 lg:col-span-5">
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
                    placeholder={dict.hero.searchPlaceholder}
                    aria-label={dict.hero.searchPlaceholder}
                    className="w-full rounded-xl border border-slate-800 bg-[#070b14] py-2.5 pl-10 pr-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <select
                    value={activeTab === "ai" ? AI_CATEGORY_SLUG : selectedCategory}
                    disabled={activeTab === "ai"}
                    onChange={(e) =>
                      updateUrlParams({ category: e.target.value })
                    }
                    aria-label={dict.categoriesSection.allFilter}
                    className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2.5 text-base text-slate-200 focus:border-cyan-500/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  >
                    {activeTab !== "ai" && (
                      <option value="all">
                        {dict.categoriesSection.allFilter}
                      </option>
                    )}
                    {visibleCategories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {locale === "pt-BR" ? cat.name_pt : cat.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <select
                    value={selectedType}
                    onChange={(e) => updateUrlParams({ type: e.target.value })}
                    aria-label={dict.hero.allTypes}
                    className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2.5 text-base text-slate-200 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                  >
                    <option value="all">{dict.hero.allTypes}</option>
                    {RESOURCE_TYPE_KEYS.map((typeKey) => (
                      <option key={typeKey} value={typeKey}>
                        {dict.resourceTypes[typeKey]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <select
                    value={selectedDifficulty}
                    onChange={(e) =>
                      updateUrlParams({ difficulty: e.target.value })
                    }
                    aria-label={dict.hero.allDifficulties}
                    className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2.5 text-base text-slate-200 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                  >
                    <option value="all">{dict.hero.allDifficulties}</option>
                    {DIFFICULTY_KEYS.map((diffKey) => (
                      <option key={diffKey} value={diffKey}>
                        {dict.difficulties[diffKey]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Secondary Filter Bar: Language, Sort & Active Count */}
              <div className="mt-3 flex flex-col justify-between gap-3 border-t border-slate-800/80 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                  <select
                    value={selectedLanguage}
                    onChange={(e) =>
                      updateUrlParams({ language: e.target.value })
                    }
                    aria-label={dict.catalogSection.allLanguages}
                    className="w-full rounded-lg border border-slate-800 bg-[#070b14] px-2.5 py-2 text-xs text-slate-300 focus:border-cyan-500/60 focus:outline-none sm:w-auto sm:py-1.5"
                  >
                    <option value="all">
                      {dict.catalogSection.allLanguages}
                    </option>
                    {LANGUAGE_KEYS.map((langKey) => (
                      <option key={langKey} value={langKey}>
                        {dict.languages[langKey]}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => updateUrlParams({ sort: e.target.value })}
                    aria-label={dict.catalogSection.sortLabel}
                    className="w-full rounded-lg border border-slate-800 bg-[#070b14] px-2.5 py-2 text-xs text-slate-300 focus:border-cyan-500/60 focus:outline-none sm:w-auto sm:py-1.5"
                  >
                    <option value="newest">
                      {dict.catalogSection.sortLabel}:{" "}
                      {dict.catalogSection.sortNewest}
                    </option>
                    <option value="alphabetical">
                      {dict.catalogSection.sortLabel}:{" "}
                      {dict.catalogSection.sortAlphabetical}
                    </option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="font-mono text-xs text-slate-400">
                    {dict.catalogSection.resultsCount(totalItems)}
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-lg border border-slate-700 bg-[#070b14] px-2.5 py-1 text-xs font-medium text-cyan-300 hover:border-cyan-500/40"
                    >
                      {dict.catalogSection.clearFilters}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Pills Strip */}
        <section className="border-b border-slate-800/60 bg-[#050811] py-3">
          <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => updateUrlParams({ category: null })}
              className={`shrink-0 rounded-lg border px-3 py-1 font-mono text-xs transition-colors ${
                selectedCategory === "all"
                  ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                  : "border-slate-800 bg-[#0d1322] text-slate-400 hover:text-slate-200"
              }`}
            >
              {dict.categoriesSection.allFilter}
            </button>
            {categories.map((cat) => {
              const active = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() =>
                    updateUrlParams({ category: active ? null : cat.slug })
                  }
                  className={`shrink-0 rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                      : "border-slate-800 bg-[#0d1322] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {locale === "pt-BR" ? cat.name_pt : cat.name_en}
                </button>
              );
            })}
          </div>
        </section>

        {/* Catalog Grid & Pagination */}
        <section id="catalog-grid" className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {bookmarkError && (
              <div
                role="alert"
                className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200"
              >
                <span>{bookmarkError}</span>
                <button
                  type="button"
                  onClick={dismissBookmarkError}
                  className="rounded px-2 py-1 font-mono text-[11px] text-amber-300 hover:bg-amber-500/20"
                >
                  ✕
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-56 animate-pulse rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-5"
                  />
                ))}
              </div>
            ) : queryError ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-10 text-center">
                <p className="text-sm text-rose-200">{queryError}</p>
                <button
                  type="button"
                  onClick={() => setReloadNonce((n) => n + 1)}
                  className="mt-4 rounded-lg bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
                >
                  {isPt ? "Tentar novamente" : "Retry"}
                </button>
              </div>
            ) : paginatedResources.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/70 p-12 text-center">
                <p className="text-sm text-slate-400">
                  {dict.catalogSection.noResults}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-lg bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30"
                  >
                    {dict.catalogSection.clearFilters}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      category={categoryMap.get(resource.categorySlug)}
                      locale={locale}
                      dict={dict}
                      isBookmarked={bookmarkedIds.includes(resource.id)}
                      onToggleBookmark={(slug) =>
                        void toggleBookmark(slug, resource.id)
                      }
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
                    pageSize={ITEMS_PER_PAGE}
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

function CatalogFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-slate-400 font-mono text-xs">
      Loading catalog...
    </div>
  );
}

export default function CatalogDirectoryPage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogContent />
    </Suspense>
  );
}
