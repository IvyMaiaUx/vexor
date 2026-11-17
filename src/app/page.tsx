"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  type DifficultyLevel,
  type ResourceType,
} from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  type CatalogResourceItem,
  queryCatalogResources,
} from "@/features/catalog/catalog-service";
import { ResourceCard } from "@/features/catalog/resource-card";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import {
  type ForumTopicItem,
  queryForumTopics,
} from "@/features/forum/forum-service";
import { useForumStore } from "@/features/forum/use-forum-store";
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

export default function HomePage() {
  const router = useRouter();
  const {
    locale,
    setLocale,
    categories,
    categoriesLoading,
    bookmarkedIds,
    toggleBookmark,
  } = useCatalogStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [filteredResources, setFilteredResources] = useState<
    CatalogResourceItem[]
  >([]);
  const [totalCatalogCount, setTotalCatalogCount] = useState<number>(0);
  const [loadedHomeKey, setLoadedHomeKey] = useState<string>("");
  const { categories: forumCategories, categoriesLoading: forumCategoriesLoading } =
    useForumStore();
  const [recentTopics, setRecentTopics] = useState<ForumTopicItem[]>([]);
  const [forumLoaded, setForumLoaded] = useState(false);

  const currentHomeKey = `${searchQuery}|${selectedCategory}|${selectedType}|${selectedDifficulty}|${categories.length}`;
  const catalogLoading = categoriesLoading || loadedHomeKey !== currentHomeKey;
  const forumLoading = forumCategoriesLoading || !forumLoaded;

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const handleHeroSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    if (selectedType !== "all") {
      params.set("type", selectedType);
    }
    if (selectedDifficulty !== "all") {
      params.set("difficulty", selectedDifficulty);
    }
    const qs = params.toString();
    router.push(qs ? `/catalog?${qs}` : "/catalog");
  };

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.slug, c]));
  }, [categories]);

  useEffect(() => {
    if (categoriesLoading) {
      return;
    }

    let cancelled = false;

    void queryCatalogResources(
      {
        search: searchQuery,
        categorySlug: selectedCategory,
        type: selectedType as ResourceType | "all",
        difficulty: selectedDifficulty as DifficultyLevel | "all",
        sortBy: "newest",
        page: 1,
        pageSize: 6,
      },
      { categories }
    ).then((res) => {
      if (cancelled) {
        return;
      }
      if (res.status === "success") {
        setFilteredResources(res.items);
        setTotalCatalogCount(res.totalCount);
      } else {
        setFilteredResources([]);
        setTotalCatalogCount(0);
      }
      setLoadedHomeKey(currentHomeKey);
    });

    return () => {
      cancelled = true;
    };
  }, [
    categories,
    categoriesLoading,
    currentHomeKey,
    searchQuery,
    selectedCategory,
    selectedDifficulty,
    selectedType,
  ]);

  useEffect(() => {
    if (forumCategoriesLoading) {
      return;
    }

    let cancelled = false;
    void queryForumTopics(
      { page: 1, pageSize: 4, sortBy: "activity" },
      { categories: forumCategories }
    ).then((res) => {
      if (cancelled) {
        return;
      }
      if (res.status === "success") {
        setRecentTopics(res.items);
      } else {
        setRecentTopics([]);
      }
      setForumLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [forumCategories, forumCategoriesLoading]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedType("all");
    setSelectedDifficulty("all");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1">
        {/* 1. HERO SECTION */}
        <section className="relative overflow-hidden border-b border-slate-800/80 bg-cyber-grid py-12 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-medium text-cyan-300 sm:px-3.5 sm:text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                <span className="truncate">{dict.hero.eyebrow}</span>
              </div>

              <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-50 sm:mt-6 sm:text-4xl lg:text-5xl lg:leading-[1.15]">
                {dict.hero.titleStart}
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                  {dict.hero.titleHighlight}
                </span>
                {dict.hero.titleEnd}
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:mt-5 sm:text-base lg:text-lg">
                {dict.hero.subtitle}
              </p>

              {/* Quick CTAs: full width stacked on mobile, side-by-side on sm+ */}
              <div className="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Link
                  href="/catalog"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 sm:py-2.5"
                >
                  {dict.hero.exploreCatalog}
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/forum"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-[#0d1322] px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 sm:py-2.5"
                >
                  {dict.hero.joinForum}
                </Link>
              </div>
            </div>

            {/* Integrated Search & Filter Bar */}
            <form
              onSubmit={handleHeroSearch}
              className="mx-auto mt-8 max-w-4xl rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-3.5 shadow-2xl backdrop-blur sm:mt-10 sm:p-4"
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:flex lg:flex-row lg:items-center lg:gap-3">
                <div className="relative sm:col-span-2 lg:flex-1">
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={dict.hero.searchPlaceholder}
                    aria-label={dict.hero.searchPlaceholder}
                    className="w-full rounded-xl border border-slate-800 bg-[#070b14] py-2.5 pl-10 pr-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm"
                  />
                </div>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  aria-label={dict.hero.allTypes}
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-200 focus:border-cyan-500/60 focus:outline-none sm:text-sm lg:w-auto"
                >
                  <option value="all">{dict.hero.allTypes}</option>
                  {RESOURCE_TYPE_KEYS.map((typeKey) => (
                    <option key={typeKey} value={typeKey}>
                      {dict.resourceTypes[typeKey]}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  aria-label={dict.hero.allDifficulties}
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-200 focus:border-cyan-500/60 focus:outline-none sm:text-sm lg:w-auto"
                >
                  <option value="all">{dict.hero.allDifficulties}</option>
                  {DIFFICULTY_KEYS.map((diffKey) => (
                    <option key={diffKey} value={diffKey}>
                      {dict.difficulties[diffKey]}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 sm:col-span-2 lg:col-span-1"
                >
                  {dict.hero.searchButton}
                </button>
              </div>

              {/* Platform Pillars / Stats */}
              <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-3 sm:mt-4 sm:grid-cols-4">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:text-xs">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  <span className="truncate">{dict.hero.stats.categories}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:text-xs">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <span className="truncate">
                    {dict.hero.stats.resourceTypes}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:text-xs">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span className="truncate">{dict.hero.stats.openSource}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:text-xs">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  <span className="truncate">{dict.hero.stats.bilingual}</span>
                </div>
              </div>
            </form>
          </div>
        </section>

        {/* 2. CATEGORIES SECTION (12 Initial Categories from seed.sql) */}
        <section
          id="categories"
          className="border-b border-slate-800/80 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  {dict.categoriesSection.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                  {dict.categoriesSection.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  {dict.categoriesSection.subtitle}
                </p>
              </div>

              <Link
                href="/catalog"
                className="self-start rounded-xl border border-slate-700 bg-[#0d1322] px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 sm:self-auto"
              >
                {dict.categoriesSection.allFilter} →
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((category) => {
                const title =
                  locale === "pt-BR" ? category.name_pt : category.name_en;
                const description =
                  locale === "pt-BR"
                    ? category.description_pt
                    : category.description_en;

                return (
                  <Link
                    key={category.id}
                    href={`/catalog?category=${category.slug}`}
                    title={`${dict.categoriesSection.filterByCategory}: ${title}`}
                    className="group flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0d1322]/90 p-4 text-left transition-all hover:border-cyan-500/40 hover:bg-[#121a2e]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded border border-slate-700/80 bg-[#070b14] px-2 py-0.5 font-mono text-[11px] font-medium text-cyan-300">
                          {category.code ??
                            category.slug.slice(0, 4).toUpperCase()}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 group-hover:text-cyan-400">
                          /{category.slug}
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-slate-100 group-hover:text-cyan-300">
                        {title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                        {description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-2.5 font-mono text-[11px] text-slate-500 group-hover:text-cyan-300">
                      <span>{dict.catalogSection.viewDetails}</span>
                      <span aria-hidden="true">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. FEATURED CATALOG SECTION */}
        <section
          id="catalog"
          className="border-b border-slate-800/80 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  {dict.catalogSection.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                  {dict.catalogSection.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  {dict.catalogSection.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {(searchQuery ||
                  selectedCategory !== "all" ||
                  selectedType !== "all" ||
                  selectedDifficulty !== "all") && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-lg border border-slate-700 bg-[#0d1322] px-3 py-1.5 text-xs font-medium text-cyan-300 hover:border-cyan-500/40"
                  >
                    {dict.catalogSection.clearFilters}
                  </button>
                )}

                <Link
                  href="/catalog"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
                >
                  {dict.catalogSection.viewFullCatalog} ({totalCatalogCount}) →
                </Link>
              </div>
            </div>

            {catalogLoading ? (
              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-56 animate-pulse rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-5"
                  />
                ))}
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-slate-800/90 bg-[#0d1322]/70 p-10 text-center">
                <p className="text-sm text-slate-400">
                  {dict.catalogSection.noResults}
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 rounded-lg bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30"
                >
                  {dict.catalogSection.clearFilters}
                </button>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    category={categoryMap.get(resource.categorySlug)}
                    locale={locale}
                    dict={dict}
                    isBookmarked={bookmarkedIds.includes(resource.id)}
                    onToggleBookmark={(s) => void toggleBookmark(s, resource.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4. TECHNICAL FORUM PREVIEW SECTION */}
        <section
          id="forum"
          className="border-b border-slate-800/80 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-indigo-400">
                  {dict.forumSection.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                  {dict.forumSection.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  {dict.forumSection.subtitle}
                </p>
              </div>

              <Link
                href="/forum/new"
                className="self-start rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/25 sm:self-auto"
              >
                + {dict.forumSection.newTopicCta}
              </Link>
            </div>

            <div className="mt-8 space-y-3">
              {forumLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-24 animate-pulse rounded-xl border border-slate-800/80 bg-[#0d1322]/70"
                  />
                ))
              ) : recentTopics.length === 0 ? (
                <div className="rounded-xl border border-slate-800/80 bg-[#0d1322]/70 p-8 text-center text-sm text-slate-400">
                  {dict.forumPage.noTopicsFound}
                </div>
              ) : (
                recentTopics.map((topic) => {
                  const category =
                    forumCategories.find((c) => c.slug === topic.categorySlug) ??
                    categoryMap.get(topic.categorySlug);
                  const categoryName = category
                    ? locale === "pt-BR"
                      ? category.name_pt
                      : category.name_en
                    : topic.categorySlug;

                  return (
                    <article
                      key={topic.id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800/90 bg-[#0d1322]/90 p-5 transition-colors hover:border-indigo-500/40 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                            {categoryName}
                          </span>
                          {Boolean(topic.acceptedPostId) && (
                            <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-300">
                              ✓ {dict.forumSection.solvedBadge}
                            </span>
                          )}
                          <span className="font-mono text-xs text-slate-500">
                            {dict.forumSection.byAuthor} @{topic.authorUsername}{" "}
                            ·{" "}
                            {new Date(topic.lastActivityAt).toLocaleDateString(
                              locale === "pt-BR" ? "pt-BR" : "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-slate-100">
                          <Link
                            href={`/forum/${topic.id}`}
                            className="transition-colors hover:text-cyan-300"
                          >
                            {topic.title}
                          </Link>
                        </h3>

                        {topic.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {topic.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded border border-slate-800 bg-[#070b14] px-2 py-0.5 font-mono text-[11px] text-slate-400"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex w-full shrink-0 items-center justify-between gap-3 border-t border-slate-800/70 pt-3 sm:w-auto sm:flex-col sm:items-end sm:gap-1.5 sm:border-0 sm:pt-0">
                        <div className="font-mono text-xs text-slate-400">
                          <span className="font-semibold text-cyan-300">
                            {topic.replyCount}
                          </span>{" "}
                          {dict.forumSection.repliesLabel}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="/forum"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0d1322] px-6 py-3 font-mono text-xs font-semibold text-cyan-300 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10"
              >
                {locale === "pt-BR"
                  ? "Explorar Todas as Discussões no Fórum"
                  : "Explore All Forum Discussions"}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 5. COMMUNITY CONTRIBUTION WORKFLOW SECTION */}
        <section id="contribute" className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-[#0d1322] via-[#0b1120] to-indigo-950/30 p-5 sm:p-10 lg:p-12">
              <div className="max-w-2xl">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  {dict.contributeSection.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                  {dict.contributeSection.title}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {dict.contributeSection.subtitle}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800/90 bg-[#070b14]/80 p-5">
                  <span className="font-mono text-xs font-semibold text-cyan-400">
                    STATUS: PENDING
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-slate-100">
                    {dict.contributeSection.steps.step1Title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {dict.contributeSection.steps.step1Desc}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800/90 bg-[#070b14]/80 p-5">
                  <span className="font-mono text-xs font-semibold text-indigo-400">
                    MODERATION REVIEW
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-slate-100">
                    {dict.contributeSection.steps.step2Title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {dict.contributeSection.steps.step2Desc}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800/90 bg-[#070b14]/80 p-5">
                  <span className="font-mono text-xs font-semibold text-emerald-400">
                    STATUS: APPROVED
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-slate-100">
                    {dict.contributeSection.steps.step3Title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {dict.contributeSection.steps.step3Desc}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-slate-800/80 pt-6 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-400">
                  {dict.contributeSection.securityNote}
                </p>
                <Link
                  href="/catalog/submit"
                  className="w-full shrink-0 rounded-xl bg-cyan-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 sm:w-auto sm:py-2.5"
                >
                  {dict.contributeSection.ctaPrimary} →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
