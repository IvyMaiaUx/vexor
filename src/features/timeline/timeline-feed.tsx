"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useForumStore } from "@/features/forum/use-forum-store";
import { createClient } from "@/lib/supabase/client";
import { TimelineComposer } from "./timeline-composer";
import { TimelinePostCard } from "./timeline-post-card";
import { fetchTimelineFeed } from "./timeline-service";
import type {
  TimelineCursor,
  TimelinePostItem,
  TimelineSortMode,
} from "./types";

interface TimelineFeedProps {
  locale: SupportedLocale;
}

type FeedTab = "for_you" | "following" | "trending";

const PRIORITY_CIRCLES: Array<{
  slug: string;
  code: string;
  shortPt: string;
  shortEn: string;
}> = [
  { slug: "blue-team", code: "BT", shortPt: "Blue Team", shortEn: "Blue Team" },
  { slug: "red-team", code: "RT", shortPt: "Red Team", shortEn: "Red Team" },
  { slug: "osint", code: "OS", shortPt: "OSINT", shortEn: "OSINT" },
  { slug: "dfir", code: "DF", shortPt: "DFIR", shortEn: "DFIR" },
  { slug: "ai-security", code: "IA", shortPt: "IA", shortEn: "AI" },
];

const COMMUNITY_LAST_SEEN_KEY = "vexor_community_last_seen_v1";

function readCommunityLastSeen(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COMMUNITY_LAST_SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") result[k] = v;
    }
    return result;
  } catch {
    return {};
  }
}

function writeCommunityLastSeen(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMMUNITY_LAST_SEEN_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export function TimelineFeed({ locale }: TimelineFeedProps) {
  const isPt = locale === "pt-BR";
  const { user } = useAuthStore();
  const { categories, categoriesLoading } = useForumStore();

  const [feedTab, setFeedTab] = useState<FeedTab>("for_you");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("all");
  const [composerOpen, setComposerOpen] = useState(false);

  const [items, setItems] = useState<TimelinePostItem[]>([]);
  const [nextCursor, setNextCursor] = useState<TimelineCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string>("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [lastSeenBySlug, setLastSeenBySlug] = useState<Record<string, string>>({});
  const [latestTopicAtBySlug, setLatestTopicAtBySlug] = useState<
    Record<string, string>
  >({});

  const sortBy: TimelineSortMode =
    feedTab === "trending" ? "trending" : "newest";

  const currentKey = `${feedTab}|${selectedCategorySlug}|${categories.length}|${reloadNonce}`;
  const loading = categoriesLoading || loadedKey !== currentKey;

  const reloadFeed = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (categoriesLoading || categories.length === 0) return;
    const prioritySlugs = new Set(PRIORITY_CIRCLES.map((c) => c.slug));
    const idToSlug = new Map<string, string>();
    const targetCategoryIds: string[] = [];
    for (const cat of categories) {
      if (prioritySlugs.has(cat.slug)) {
        idToSlug.set(cat.id, cat.slug);
        targetCategoryIds.push(cat.id);
      }
    }
    if (targetCategoryIds.length === 0) return;

    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from("topics")
      .select("category_id, created_at")
      .in("category_id", targetCategoryIds)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const latest: Record<string, string> = {};
        for (const row of data as Array<{
          category_id: string | null;
          created_at: string | null;
        }>) {
          if (!row.category_id || !row.created_at) continue;
          const slug = idToSlug.get(row.category_id);
          if (slug && !latest[slug]) {
            latest[slug] = row.created_at;
          }
        }
        setLastSeenBySlug((prev) => ({
          ...readCommunityLastSeen(),
          ...prev,
        }));
        setLatestTopicAtBySlug(latest);
      });

    return () => {
      cancelled = true;
    };
  }, [categories, categoriesLoading]);

  const markCategorySeen = useCallback((slug: string) => {
    const nowIso = new Date().toISOString();
    setLastSeenBySlug((prev) => {
      const next = { ...prev, [slug]: nowIso };
      writeCommunityLastSeen(next);
      return next;
    });
  }, []);

  const handleSelectCircle = useCallback(
    (slug: string) => {
      setSelectedCategorySlug((prev) => {
        const next = prev === slug ? "all" : slug;
        if (next !== "all") {
          markCategorySeen(next);
          if (feedTab === "following") {
            setFeedTab("for_you");
          }
        }
        return next;
      });
    },
    [feedTab, markCategorySeen]
  );

  const communityCircles = useMemo(() => {
    const bySlug = new Map(categories.map((c) => [c.slug, c]));
    return PRIORITY_CIRCLES.map((item) => {
      const real = bySlug.get(item.slug);
      const latestAt = latestTopicAtBySlug[item.slug];
      const lastSeenAt = lastSeenBySlug[item.slug];
      const hasNewPosts = Boolean(
        latestAt &&
          (!lastSeenAt ||
            new Date(latestAt).getTime() > new Date(lastSeenAt).getTime())
      );
      return {
        slug: item.slug,
        code: item.code,
        label: isPt
          ? item.shortPt
          : real?.name_en
            ? item.shortEn
            : item.shortEn,
        exists: Boolean(real),
        hasNewPosts,
      };
    });
  }, [categories, isPt, lastSeenBySlug, latestTopicAtBySlug]);

  useEffect(() => {
    if (categoriesLoading) return;
    let cancelled = false;
    void fetchTimelineFeed(
      {
        kind: "all",
        categorySlug: selectedCategorySlug,
        sortBy,
        pageSize: 10,
      },
      { categories }
    ).then((res) => {
      if (cancelled) return;
      if (res.status === "error") {
        setErrorMessage(
          res.errorMessage ||
            (isPt ? "Erro ao carregar a timeline." : "Error loading timeline.")
        );
        setItems([]);
      } else {
        setErrorMessage(null);
        setItems(res.items);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      }
      setLoadedKey(currentKey);
    });
    return () => {
      cancelled = true;
    };
  }, [categories, categoriesLoading, currentKey, isPt, selectedCategorySlug, sortBy]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const res = await fetchTimelineFeed(
      {
        kind: "all",
        categorySlug: selectedCategorySlug,
        sortBy,
        cursor: sortBy === "newest" ? nextCursor : null,
        offset: sortBy !== "newest" ? items.length : undefined,
        pageSize: 10,
      },
      { categories }
    );
    setLoadingMore(false);
    if (res.status === "success") {
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.items.filter((p) => !seen.has(p.id))];
      });
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    }
  };

  const handleCreated = (newPost: TimelinePostItem) => {
    if (
      selectedCategorySlug === "all" ||
      selectedCategorySlug === newPost.categorySlug
    ) {
      setItems((prev) => [newPost, ...prev]);
    }
    if (newPost.categorySlug) {
      setLatestTopicAtBySlug((prev) => ({
        ...prev,
        [newPost.categorySlug]: newPost.createdAt,
      }));
      markCategorySeen(newPost.categorySlug);
    }
    setComposerOpen(false);
  };

  const handleVoteUpdated = (topicId: string, voted: boolean, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === topicId
          ? {
              ...item,
              userHasVoted: voted,
              voteCount: Math.max(0, item.voteCount + delta),
            }
          : item
      )
    );
  };

  const userInitial = (user?.displayName || user?.username || "V")
    .slice(0, 1)
    .toUpperCase();

  return (
    <section id="timeline" className="py-4 sm:py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {/* 1. Community Circles Strip */}
        <div
          className="no-scrollbar -mx-4 mb-3 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          role="region"
          aria-label={isPt ? "Comunidades" : "Communities"}
        >
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center text-xs text-slate-400 transition-colors hover:text-cyan-300"
          >
            <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-slate-700 p-[3px]">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-cyan-500/15 font-mono text-lg font-bold text-cyan-300">
                +
              </span>
            </span>
            <span className="w-full truncate">{isPt ? "Criar" : "Create"}</span>
          </button>

          {communityCircles.map((circle) => {
            const active = selectedCategorySlug === circle.slug;
            const ringClasses = active
              ? "border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
              : circle.hasNewPosts
                ? "border-cyan-400/90"
                : "border-slate-700";
            const innerClasses = active
              ? "bg-cyan-500/20 text-cyan-200"
              : circle.hasNewPosts
                ? "bg-slate-800/80 text-cyan-300"
                : "bg-slate-800/60 text-slate-300";
            return (
              <button
                key={circle.slug}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectCircle(circle.slug)}
                className={`flex w-16 shrink-0 flex-col items-center gap-1.5 text-center text-xs transition-colors ${
                  active
                    ? "font-semibold text-cyan-300"
                    : circle.hasNewPosts
                      ? "text-slate-200 hover:text-cyan-300"
                      : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span
                  className={`flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 p-[3px] transition-colors ${ringClasses}`}
                >
                  <span
                    className={`flex h-full w-full items-center justify-center rounded-full font-mono text-sm font-bold transition-colors ${innerClasses}`}
                  >
                    {circle.code}
                  </span>
                </span>
                <span className="w-full truncate">{circle.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2. Quick Composer Trigger Card */}
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="mb-2 flex min-h-[58px] w-full items-center gap-3 rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 px-3.5 py-2.5 text-left transition-colors hover:border-cyan-500/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-500/30 bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                width={40}
                height={40}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              userInitial
            )}
          </span>
          <span className="flex-1 text-sm text-slate-400 sm:text-[15px]">
            {isPt
              ? "O que você descobriu hoje?"
              : "What did you discover today?"}
          </span>
          <span className="text-cyan-400" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[22px] w-[22px]"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </button>

        {/* 3. Feed Tabs (Para você / Seguindo / Em alta) */}
        <div
          role="tablist"
          aria-label={isPt ? "Filtro do feed" : "Feed filter"}
          className="-mx-4 mb-3 flex border-b border-slate-800/90 sm:mx-0"
        >
          {(
            [
              { id: "for_you", pt: "Para você", en: "For you" },
              { id: "following", pt: "Seguindo", en: "Following" },
              { id: "trending", pt: "Em alta", en: "Trending" },
            ] as const
          ).map((tab) => {
            const active = feedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFeedTab(tab.id)}
                className={`relative flex min-h-[44px] flex-1 items-center justify-center text-sm transition-colors ${
                  active
                    ? "font-semibold text-cyan-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {isPt ? tab.pt : tab.en}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-400"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Community Filter Pill */}
        {selectedCategorySlug !== "all" && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
            <span>
              {isPt ? "Comunidade:" : "Community:"}{" "}
              <strong className="font-semibold text-cyan-100">
                {communityCircles.find((c) => c.slug === selectedCategorySlug)
                  ?.label ?? selectedCategorySlug}
              </strong>
            </span>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/catalog?category=${encodeURIComponent(selectedCategorySlug)}`}
                className="inline-flex min-h-[32px] items-center rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 hover:text-cyan-100"
              >
                {isPt ? "Ver no catálogo" : "View in catalog"}
              </Link>
              <button
                type="button"
                onClick={() => setSelectedCategorySlug("all")}
                className="min-h-[32px] rounded-lg px-2 font-semibold text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-100"
              >
                {isPt ? "Limpar" : "Clear"}
              </button>
            </div>
          </div>
        )}

        {/* 4. Feed Content */}
        {feedTab === "following" ? (
          // TODO(backend): conectar aba "Seguindo" à relação de usuários seguidos quando existir no Supabase
          <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-8 text-center">
            <p className="text-sm font-medium text-slate-200">
              {isPt
                ? "Você ainda não está seguindo ninguém."
                : "You are not following anyone yet."}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">
              {isPt
                ? "Explore as comunidades para descobrir membros e acompanhar publicações técnicas."
                : "Explore communities to discover members and follow technical posts."}
            </p>
            <Link
              href="/forum"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
            >
              {isPt ? "Explorar comunidades" : "Explore communities"}
            </Link>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-44 animate-pulse rounded-2xl border border-slate-800/80 bg-[#0d1322]/70"
              />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center">
            <p className="text-sm text-rose-200">{errorMessage}</p>
            <button
              type="button"
              onClick={reloadFeed}
              className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-rose-500/20 px-4 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
            >
              {isPt ? "Tentar novamente" : "Retry"}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-8 text-center">
            <p className="text-sm text-slate-300">
              {isPt
                ? "Nenhuma publicação encontrada nesta comunidade ainda."
                : "No posts found in this community yet."}
            </p>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              {isPt ? "Criar primeira publicação" : "Create first post"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <TimelinePostCard
                key={item.id}
                post={item}
                locale={locale}
                currentUserId={user?.id ?? null}
                onVoteUpdated={handleVoteUpdated}
              />
            ))}

            {hasMore && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void handleLoadMore()}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-6 font-mono text-xs font-semibold text-cyan-300 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10 disabled:opacity-50"
                >
                  {loadingMore
                    ? isPt
                      ? "Carregando..."
                      : "Loading..."
                    : isPt
                      ? "Carregar mais publicações"
                      : "Load more posts"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-Screen / Modal Composer */}
      {composerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isPt ? "Nova publicação" : "New post"}
          className="fixed inset-0 z-50 flex flex-col bg-[#070b14] sm:items-center sm:justify-center sm:bg-slate-950/80 sm:p-4 sm:backdrop-blur-sm"
        >
          <div className="flex h-full w-full flex-col overflow-hidden bg-[#070b14] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-800">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/90 bg-[#0d1322]/90 px-2 sm:px-4">
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                aria-label={isPt ? "Fechar" : "Close"}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[22px] w-[22px]"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <span className="text-base font-semibold text-slate-100">
                {isPt ? "Nova publicação" : "New post"}
              </span>
              <span className="w-11" aria-hidden="true" />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <TimelineComposer
                locale={locale}
                categories={categories}
                onCreated={handleCreated}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
