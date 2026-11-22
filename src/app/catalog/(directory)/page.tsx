"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  type DifficultyLevel,
  type ResourceLanguage,
  type ResourcePricingModel,
  type ResourceType,
} from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  type CatalogResourceItem,
  queryCatalogResources,
} from "@/features/catalog/catalog-service";
import { FilterSheet } from "@/features/catalog/filter-sheet";
import { getPricingModelLabel } from "@/features/catalog/pricing-labels";
import { ResourceCard } from "@/features/catalog/resource-card";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";

const ITEMS_PER_PAGE = 12;
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
  const selectedPricing = searchParams?.get("pricing") ?? "all";
  const noCardOnly = searchParams?.get("noCard") === "1";
  const onlyBookmarks =
    searchParams?.get("bookmarks") === "true" ||
    searchParams?.get("bookmarks") === "1";
  const sortBy =
    searchParams?.get("sort") === "alphabetical" ? "alphabetical" : "newest";

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [items, setItems] = useState<CatalogResourceItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loadedPage, setLoadedPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loadedKey, setLoadedKey] = useState<string>("");
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const currentQueryKey = `${activeTab}|${searchQuery}|${effectiveCategory}|${excludeCategory ?? ""}|${selectedType}|${selectedDifficulty}|${selectedLanguage}|${selectedPricing}|${noCardOnly}|${onlyBookmarks}|${bookmarkedIds.join(",")}|${sortBy}|${reloadNonce}|${categories.length}`;
  const isLoading = categoriesLoading || loadedKey !== currentQueryKey;

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams?.toString() ?? "");

      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all" || value === "false") {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });

      current.delete("page");
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
    if (categoriesLoading) return;
    let cancelled = false;

    void queryCatalogResources(
      {
        search: searchQuery,
        categorySlug: effectiveCategory,
        excludeCategorySlug: excludeCategory,
        type: selectedType as ResourceType | "all",
        difficulty: selectedDifficulty as DifficultyLevel | "all",
        language: selectedLanguage as ResourceLanguage | "all",
        pricingModel: selectedPricing as ResourcePricingModel | "all",
        requiresCreditCard: noCardOnly ? "no" : "all",
        onlyBookmarks,
        bookmarkedIds,
        sortBy,
        page: 1,
        pageSize: ITEMS_PER_PAGE,
      },
      { categories }
    ).then((res) => {
      if (cancelled) return;
      if (res.status === "error") {
        setItems([]);
        setTotalItems(0);
        setLoadedPage(1);
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
        setLoadedPage(1);
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
    currentQueryKey,
    effectiveCategory,
    excludeCategory,
    isPt,
    noCardOnly,
    onlyBookmarks,
    reloadNonce,
    searchQuery,
    selectedDifficulty,
    selectedLanguage,
    selectedPricing,
    selectedType,
    sortBy,
  ]);

  const handleLoadMore = async () => {
    if (loadingMore || loadedPage >= totalPages) return;
    const nextPage = loadedPage + 1;
    setLoadingMore(true);

    const res = await queryCatalogResources(
      {
        search: searchQuery,
        categorySlug: effectiveCategory,
        excludeCategorySlug: excludeCategory,
        type: selectedType as ResourceType | "all",
        difficulty: selectedDifficulty as DifficultyLevel | "all",
        language: selectedLanguage as ResourceLanguage | "all",
        pricingModel: selectedPricing as ResourcePricingModel | "all",
        requiresCreditCard: noCardOnly ? "no" : "all",
        onlyBookmarks,
        bookmarkedIds,
        sortBy,
        page: nextPage,
        pageSize: ITEMS_PER_PAGE,
      },
      { categories }
    );

    setLoadingMore(false);
    if (res.status === "success") {
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...res.items.filter((item) => !seen.has(item.id))];
      });
      setLoadedPage(nextPage);
      setTotalItems(res.totalCount);
      setTotalPages(res.totalPages);
    }
  };

  const handleTabChange = (nextTab: CatalogTab) => {
    if (nextTab === "all") {
      updateUrlParams({
        tab: null,
        bookmarks: null,
        category: selectedCategory === AI_CATEGORY_SLUG ? null : selectedCategory,
      });
      return;
    }
    if (nextTab === "resources") {
      updateUrlParams({
        tab: "resources",
        bookmarks: null,
        category: selectedCategory === AI_CATEGORY_SLUG ? null : selectedCategory,
      });
      return;
    }
    updateUrlParams({
      tab: "ai",
      bookmarks: null,
      category: null,
    });
  };

  const clearAllFilters = () => {
    router.replace("/catalog", { scroll: false });
  };

  // Build removable active filter chips
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (effectiveCategory !== "all" && activeTab !== "ai") {
      const cat = categoryMap.get(effectiveCategory);
      chips.push({
        key: "category",
        label: cat ? (isPt ? cat.name_pt : cat.name_en) : effectiveCategory,
        onRemove: () => updateUrlParams({ category: null }),
      });
    }
    if (selectedType !== "all") {
      chips.push({
        key: "type",
        label: dict.resourceTypes[selectedType as ResourceType] ?? selectedType,
        onRemove: () => updateUrlParams({ type: null }),
      });
    }
    if (selectedDifficulty !== "all") {
      chips.push({
        key: "difficulty",
        label:
          dict.difficulties[selectedDifficulty as DifficultyLevel] ??
          selectedDifficulty,
        onRemove: () => updateUrlParams({ difficulty: null }),
      });
    }
    if (selectedLanguage !== "all") {
      chips.push({
        key: "language",
        label: selectedLanguage.toUpperCase(),
        onRemove: () => updateUrlParams({ language: null, lang: null }),
      });
    }
    if (selectedPricing !== "all") {
      chips.push({
        key: "pricing",
        label: getPricingModelLabel(
          selectedPricing as ResourcePricingModel,
          locale
        ),
        onRemove: () => updateUrlParams({ pricing: null }),
      });
    }
    if (noCardOnly) {
      chips.push({
        key: "noCard",
        label: isPt ? "Sem cartão" : "No card required",
        onRemove: () => updateUrlParams({ noCard: null }),
      });
    }
    return chips;
  }, [
    activeTab,
    categoryMap,
    dict.difficulties,
    dict.resourceTypes,
    effectiveCategory,
    isPt,
    locale,
    noCardOnly,
    selectedDifficulty,
    selectedLanguage,
    selectedPricing,
    selectedType,
    updateUrlParams,
  ]);

  const activeFilterCount = activeFilterChips.length;
  const hasMore = loadedPage < totalPages && items.length < totalItems;

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-4 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* 1. Header Row: Eyebrow + Title + Count */}
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
                {dict.catalogSection.eyebrow}
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                {isPt ? "Catálogo" : "Catalog"}
              </h1>
            </div>
            <span className="shrink-0 text-xs font-medium text-slate-400 sm:text-sm">
              {isLoading
                ? "..."
                : `${totalItems} ${
                    totalItems === 1
                      ? isPt
                        ? "recurso"
                        : "resource"
                      : isPt
                        ? "recursos"
                        : "resources"
                  }`}
            </span>
          </div>

          {/* 2. Search + Filter Button Row */}
          <div className="mb-2.5 flex items-center gap-2">
            <label className="flex min-h-[48px] flex-1 items-center gap-2.5 rounded-xl border border-slate-800 bg-[#0d1322] px-3 text-slate-400 focus-within:border-cyan-500/60">
              <span aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[18px] w-[18px]"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => updateUrlParams({ q: e.target.value })}
                placeholder={
                  isPt
                    ? "Pesquisar ferramentas, labs…"
                    : "Search tools, labs…"
                }
                aria-label={isPt ? "Pesquisar no catálogo" : "Search catalog"}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none sm:text-sm"
              />
            </label>

            <button
              type="button"
              onClick={() => setFilterSheetOpen(true)}
              aria-label={
                activeFilterCount > 0
                  ? isPt
                    ? `Filtros (${activeFilterCount} ativos)`
                    : `Filters (${activeFilterCount} active)`
                  : isPt
                    ? "Abrir filtros"
                    : "Open filters"
              }
              className={`relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                activeFilterCount > 0
                  ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                  : "border-slate-800 bg-[#0d1322] text-slate-200 hover:border-cyan-500/40 hover:text-cyan-300"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[22px] w-[22px]"
              >
                <path d="M3 5h18M6 12h12M10 19h4" />
              </svg>
              {activeFilterCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-cyan-400"
                />
              )}
            </button>
          </div>

          {/* 3. Primary Scope Chips (Tudo / Ferramentas / IAs e Modelos / Salvos) */}
          <div
            role="tablist"
            aria-label={isPt ? "Seções do catálogo" : "Catalog sections"}
            className="no-scrollbar -mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "all" && !onlyBookmarks}
              onClick={() => handleTabChange("all")}
              className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                activeTab === "all" && !onlyBookmarks
                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                  : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700"
              }`}
            >
              {isPt ? "Tudo" : "All"}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "resources" && !onlyBookmarks}
              onClick={() => handleTabChange("resources")}
              className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                activeTab === "resources" && !onlyBookmarks
                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                  : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700"
              }`}
            >
              {isPt ? "Ferramentas" : "Tools"}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "ai" && !onlyBookmarks}
              onClick={() => handleTabChange("ai")}
              className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                activeTab === "ai" && !onlyBookmarks
                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                  : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700"
              }`}
            >
              {isPt ? "IAs e Modelos" : "AI & Models"}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={onlyBookmarks}
              onClick={() =>
                updateUrlParams({ bookmarks: onlyBookmarks ? null : "true" })
              }
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                onlyBookmarks
                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                  : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill={onlyBookmarks ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
              </svg>
              <span>
                {isPt ? "Salvos" : "Saved"}
                {bookmarkedSlugs.length > 0 ? ` (${bookmarkedSlugs.length})` : ""}
              </span>
            </button>
          </div>

          {/* 4. Removable Active Filter Chips */}
          {activeFilterChips.length > 0 && (
            <div className="no-scrollbar -mx-4 mb-2 flex items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={
                    isPt ? `Remover filtro ${chip.label}` : `Remove filter ${chip.label}`
                  }
                  className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-cyan-500/50 bg-cyan-500/15 px-3 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-500/25"
                >
                  <span>{chip.label}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex min-h-[36px] shrink-0 items-center px-2.5 text-xs font-medium text-slate-400 hover:text-cyan-300"
              >
                {isPt ? "Limpar" : "Clear"}
              </button>
            </div>
          )}

          {/* 5. Compact Sort Row */}
          <div className="mb-3 flex items-center justify-end">
            <label className="inline-flex items-center gap-1 text-xs text-slate-400">
              <span className="sr-only">
                {isPt ? "Ordenar recursos" : "Sort resources"}
              </span>
              <select
                value={sortBy}
                onChange={(e) =>
                  updateUrlParams({
                    sort: e.target.value === "newest" ? null : e.target.value,
                  })
                }
                className="min-h-[36px] cursor-pointer rounded-lg bg-transparent px-2 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              >
                <option value="newest" className="bg-[#0d1322] text-slate-200">
                  {isPt ? "Mais recentes" : "Newest"}
                </option>
                <option
                  value="alphabetical"
                  className="bg-[#0d1322] text-slate-200"
                >
                  {isPt ? "Nome (A–Z)" : "Name (A–Z)"}
                </option>
              </select>
            </label>
          </div>

          {/* 6. Catalog Cards Grid */}
          <section id="catalog-grid">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div
                    key={idx}
                    className="h-48 animate-pulse rounded-2xl border border-slate-800/80 bg-[#0d1322]/70"
                  />
                ))}
              </div>
            ) : queryError ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center">
                <p className="text-sm text-rose-200">{queryError}</p>
                <button
                  type="button"
                  onClick={() => setReloadNonce((n) => n + 1)}
                  className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-rose-500/20 px-4 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
                >
                  {isPt ? "Tentar novamente" : "Try again"}
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0d1322]/60 p-10 text-center">
                <p className="text-base font-semibold text-slate-200">
                  {dict.catalogSection.noResults}
                </p>
                <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-400">
                  {isPt
                    ? "Tente ajustar ou limpar os filtros aplicados."
                    : "Try adjusting or clearing your active filters."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
                  >
                    {dict.catalogSection.clearFilters}
                  </button>
                  <Link
                    href="/catalog/submit"
                    className="inline-flex min-h-[44px] items-center rounded-xl bg-cyan-500 px-4 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    + {dict.nav.submitResource}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      category={categoryMap.get(resource.categorySlug)}
                      locale={locale}
                      dict={dict}
                      isBookmarked={bookmarkedSlugs.includes(resource.slug)}
                      onToggleBookmark={toggleBookmark}
                    />
                  ))}
                </div>

                {/* Progressive "Carregar mais" replacing 1 / 626 pagination */}
                <div className="mt-6 flex flex-col items-center gap-3">
                  <p className="font-mono text-xs text-slate-400">
                    {isPt
                      ? `Mostrando ${items.length} de ${totalItems} recursos`
                      : `Showing ${items.length} of ${totalItems} resources`}
                  </p>
                  {hasMore && (
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={() => void handleLoadMore()}
                      className="inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-6 text-sm font-semibold text-cyan-300 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10 disabled:opacity-50"
                    >
                      {loadingMore
                        ? isPt
                          ? "Carregando..."
                          : "Loading..."
                        : isPt
                          ? "Carregar mais"
                          : "Load more"}
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        locale={locale}
        dict={dict}
        categories={categories}
        selectedCategory={effectiveCategory}
        selectedType={selectedType}
        selectedDifficulty={selectedDifficulty}
        selectedLanguage={selectedLanguage}
        selectedPricing={selectedPricing}
        noCardOnly={noCardOnly}
        totalCount={totalItems}
        onUpdate={updateUrlParams}
        onClearAll={clearAllFilters}
      />

      <Footer locale={locale} dict={dict} />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#070b14] font-mono text-sm text-cyan-400">
          Carregando catálogo...
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
