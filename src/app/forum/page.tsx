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
  // TODO(backend): persistir inscrição em comunidades quando existir tabela community_memberships
  const [joinedCommunitySlugs, setJoinedCommunitySlugs] = useState<string[]>([
    "blue-team",
  ]);
  // TODO(backend): carregar sugestões reais de membros e persistir follow quando existir tabela follows
  const [followedSuggestions, setFollowedSuggestions] = useState<string[]>([]);

  const isPt = locale === "pt-BR";

  const toggleJoinCommunity = (slug: string) => {
    setJoinedCommunitySlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const toggleFollowSuggestion = (username: string) => {
    setFollowedSuggestions((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  // TODO(backend): substituir por sugestões reais de membros via Supabase quando houver endpoint/RPC
  const suggestedPeople = [
    {
      username: "matheus",
      initial: "M",
      specialty: "Pentester · OSINT",
    },
    {
      username: "carol",
      initial: "C",
      specialty: "DFIR · Malware",
    },
  ];
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
        {/* Page Header + Comunidades (Explorar) */}
        <section className="border-b border-slate-800/80 bg-cyber-grid py-6 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
                  {isPt ? "EXPLORAR" : "EXPLORE"}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-4xl">
                  {isPt ? "Comunidades" : "Communities"}
                </h1>
              </div>

              <Link
                href="/forum/new"
                className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-cyan-500 px-4 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 sm:px-5"
              >
                + {dict.forumPage.newTopicCta}
              </Link>
            </div>

            {/* Search Input */}
            <label className="mt-4 flex min-h-[48px] items-center gap-2.5 rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-slate-400 focus-within:border-cyan-500/60">
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
                onChange={(e) =>
                  updateUrlParams({ q: e.target.value.trim() || null })
                }
                placeholder={
                  isPt
                    ? "Buscar pessoas, tags e comunidades"
                    : "Search people, tags, and communities"
                }
                aria-label={
                  isPt
                    ? "Buscar pessoas, tags e comunidades"
                    : "Search people, tags, and communities"
                }
                className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none sm:text-sm"
              />
            </label>

            {/* EM ALTA (Trending Tags) */}
            {tags.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  {isPt ? "EM ALTA" : "TRENDING"}
                </p>
                <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                  {tags.slice(0, 10).map((tag) => {
                    const active = selectedTag === tag.slug;
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        onClick={() =>
                          updateUrlParams({ tag: active ? null : tag.slug })
                        }
                        className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-3.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                            : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        #{tag.slug}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUAS COMUNIDADES + SUGERIDOS PARA SEGUIR (2 columns on lg, stacked on mobile) */}
            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  {isPt ? "SUAS COMUNIDADES" : "YOUR COMMUNITIES"}
                </p>
                <div className="divide-y divide-slate-800/70 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 px-4">
                  {categories.slice(0, 6).map((cat) => {
                    const joined = joinedCommunitySlugs.includes(cat.slug);
                    const isSelected = selectedCategory === cat.slug;
                    const code = (isPt ? cat.name_pt : cat.name_en)
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() ?? "")
                      .join("");
                    return (
                      <div
                        key={cat.slug}
                        className="flex min-h-[64px] items-center gap-3 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateUrlParams({
                              category: isSelected ? null : cat.slug,
                            })
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
                            {code || "VX"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-semibold ${
                                isSelected ? "text-cyan-300" : "text-slate-100"
                              }`}
                            >
                              {isPt ? cat.name_pt : cat.name_en}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {isPt ? cat.description_pt : cat.description_en}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleJoinCommunity(cat.slug)}
                          aria-pressed={joined}
                          className={`inline-flex min-h-[40px] shrink-0 items-center rounded-xl px-3.5 text-xs font-semibold transition-colors ${
                            joined
                              ? "border border-slate-700 bg-[#070b14] text-slate-200 hover:border-cyan-500/40"
                              : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                          }`}
                        >
                          {joined
                            ? isPt
                              ? "Entrou"
                              : "Joined"
                            : isPt
                              ? "Entrar"
                              : "Join"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5">
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  {isPt ? "SUGERIDOS PARA SEGUIR" : "SUGGESTED TO FOLLOW"}
                </p>
                <div className="divide-y divide-slate-800/70 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 px-4">
                  {suggestedPeople.map((person) => {
                    const following = followedSuggestions.includes(
                      person.username
                    );
                    return (
                      <div
                        key={person.username}
                        className="flex min-h-[60px] items-center gap-3 py-2.5"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
                          {person.initial}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-sm font-semibold text-emerald-400">
                            @{person.username}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {person.specialty}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFollowSuggestion(person.username)}
                          aria-pressed={following}
                          className={`inline-flex min-h-[40px] shrink-0 items-center rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
                            following
                              ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                              : "border-slate-700 bg-[#070b14] text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300"
                          }`}
                        >
                          {following
                            ? isPt
                              ? "Seguindo"
                              : "Following"
                            : isPt
                              ? "Seguir"
                              : "Follow"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Filter & Sort Bar for Discussions Below */}
            <div className="mt-5 rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-3 shadow-xl sm:p-4">
              {/* Tabs: All/Activity, Newest, Solved, Unanswered */}
              <div className="flex flex-wrap items-center justify-between gap-3">
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
