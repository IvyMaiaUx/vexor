"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { Pagination } from "@/features/catalog/pagination";
import { ResourceCard } from "@/features/catalog/resource-card";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";

const ITEMS_PER_PAGE = 9;

export default function BookmarksPage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const {
    locale,
    setLocale,
    categories,
    bookmarkedIds,
    bookmarkedSlugs,
    bookmarkedItems,
    bookmarksLoading,
    bookmarkError,
    dismissBookmarkError,
    toggleBookmark,
    clearAllBookmarks,
  } = useCatalogStore();

  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState("all");
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.slug, c])),
    [categories]
  );

  // All resources that are bookmarked by the authenticated user
  const savedResources = useMemo(() => {
    return bookmarkedItems.filter((res) => {
      if (filterCategory !== "all" && res.categorySlug !== filterCategory) {
        return false;
      }
      return true;
    });
  }, [bookmarkedItems, filterCategory]);

  const totalItems = savedResources.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(page, totalPages);

  const paginatedResources = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return savedResources.slice(start, start + ITEMS_PER_PAGE);
  }, [savedResources, safeCurrentPage]);

  // Categories present in the bookmarked items
  const availableCategorySlugs = useMemo(() => {
    const slugs = new Set(bookmarkedItems.map((r) => r.categorySlug));
    return Array.from(slugs);
  }, [bookmarkedItems]);

  const handleClearAll = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        isPt
          ? "Tem certeza de que deseja remover todos os recursos dos seus favoritos?"
          : "Are you sure you want to remove all saved resources from your bookmarks?"
      );
      if (confirmed) {
        await clearAllBookmarks();
        setPage(1);
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b border-slate-800/80 bg-cyber-grid py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 font-mono text-xs text-slate-400"
            >
              <Link
                href="/catalog"
                className="transition-colors hover:text-cyan-400"
              >
                {dict.nav.catalog}
              </Link>
              <span>/</span>
              <span className="text-cyan-300">{dict.bookmarksPage.title}</span>
            </nav>

            <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  {dict.bookmarksPage.eyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
                  {dict.bookmarksPage.title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                  {dict.bookmarksPage.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-mono text-xs font-semibold text-cyan-300">
                  ★ {dict.bookmarksPage.countLabel(bookmarkedSlugs.length)}
                </span>

                {bookmarkedSlugs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
                  >
                    {dict.bookmarksPage.clearAll}
                  </button>
                )}

                <Link
                  href="/catalog"
                  className="rounded-xl border border-slate-700 bg-[#0d1322] px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                >
                  ← {dict.bookmarksPage.backToCatalog}
                </Link>
              </div>
            </div>

            {/* Category Filter for Bookmarks if multiple categories exist */}
            {availableCategorySlugs.length > 1 && (
              <div className="no-scrollbar mt-6 flex items-center gap-2 overflow-x-auto border-t border-slate-800/80 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory("all");
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-lg border px-3 py-1 font-mono text-xs transition-colors ${
                    filterCategory === "all"
                      ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                      : "border-slate-800 bg-[#0d1322] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {dict.categoriesSection.allFilter} ({bookmarkedSlugs.length})
                </button>
                {availableCategorySlugs.map((slug) => {
                  const cat = categoryMap.get(slug);
                  const active = filterCategory === slug;
                  const catCount = bookmarkedItems.filter(
                    (r) => r.categorySlug === slug
                  ).length;
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => {
                        setFilterCategory(active ? "all" : slug);
                        setPage(1);
                      }}
                      className={`shrink-0 rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                          : "border-slate-800 bg-[#0d1322] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      {cat
                        ? locale === "pt-BR"
                          ? cat.name_pt
                          : cat.name_en
                        : slug}{" "}
                      ({catCount})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Bookmarks List & Pagination */}
        <section className="py-12 sm:py-16">
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

            {!isAuthLoading && !user ? (
              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/80 p-12 text-center">
                <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">
                  {isPt
                    ? "Entre para acessar seus favoritos"
                    : "Sign in to access your bookmarks"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  {isPt
                    ? "Seus recursos favoritos são salvos com segurança na sua conta."
                    : "Your bookmarked resources are securely stored in your account."}
                </p>
                <div className="mt-6">
                  <Link
                    href="/login?next=%2Fcatalog%2Fbookmarks"
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400"
                  >
                    {dict.nav.signIn} →
                  </Link>
                </div>
              </div>
            ) : bookmarksLoading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-56 animate-pulse rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-5"
                  />
                ))}
              </div>
            ) : paginatedResources.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/80 p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-[#070b14] text-2xl text-slate-500">
                  ☆
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-100 sm:text-xl">
                  {dict.bookmarksPage.emptyTitle}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  {dict.bookmarksPage.emptyDesc}
                </p>
                <div className="mt-6">
                  <Link
                    href="/catalog"
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400"
                  >
                    {dict.bookmarksPage.exploreCta} →
                  </Link>
                </div>
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
                    onPageChange={(p) => setPage(p)}
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
