"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useForumStore } from "@/features/forum/use-forum-store";
import { TimelineComposer } from "./timeline-composer";
import { TimelinePostCard } from "./timeline-post-card";
import { fetchTimelineFeed } from "./timeline-service";
import type {
  TimelineCursor,
  TimelinePostItem,
  TimelineSortMode,
  TopicKind,
} from "./types";

interface TimelineFeedProps {
  locale: SupportedLocale;
}

const FILTER_TABS: Array<{
  id: TopicKind | "all";
  labelPt: string;
  labelEn: string;
}> = [
  { id: "all", labelPt: "Todas", labelEn: "All" },
  { id: "discussion", labelPt: "Discussões", labelEn: "Discussions" },
  { id: "question", labelPt: "Perguntas", labelEn: "Questions" },
  { id: "tool_share", labelPt: "Ferramentas e recursos", labelEn: "Tools & resources" },
  { id: "note", labelPt: "Notas", labelEn: "Notes" },
];

export function TimelineFeed({ locale }: TimelineFeedProps) {
  const isPt = locale === "pt-BR";
  const { user } = useAuthStore();
  const { categories, categoriesLoading } = useForumStore();

  const [kindFilter, setKindFilter] = useState<TopicKind | "all">("all");
  const [sortBy, setSortBy] = useState<TimelineSortMode>("newest");
  const [items, setItems] = useState<TimelinePostItem[]>([]);
  const [nextCursor, setNextCursor] = useState<TimelineCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string>("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const currentKey = `${kindFilter}|${sortBy}|${categories.length}|${reloadNonce}`;
  const loading = categoriesLoading || loadedKey !== currentKey;

  const reloadFeed = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (categoriesLoading) return;
    let cancelled = false;
    void fetchTimelineFeed(
      { kind: kindFilter, sortBy, pageSize: 10 },
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
  }, [categories, categoriesLoading, currentKey, isPt, kindFilter, sortBy]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const res = await fetchTimelineFeed(
      {
        kind: kindFilter,
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
    if (kindFilter === "all" || kindFilter === newPost.kind) {
      setItems((prev) => [newPost, ...prev]);
    }
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

  const handleReplyAdded = (topicId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === topicId
          ? { ...item, replyCount: item.replyCount + 1 }
          : item
      )
    );
  };

  return (
    <section
      id="timeline"
      className="border-b border-slate-800/80 py-10 sm:py-14"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
              {isPt ? "COMUNIDADE VEXOR · FEED" : "VEXOR COMMUNITY · FEED"}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
              {isPt ? "Timeline Social" : "Social Timeline"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/messages"
              className="rounded-xl border border-slate-700 bg-[#0d1322] px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
            >
              {isPt ? "Mensagens Privadas" : "Private Messages"}
            </Link>
            <Link
              href="/forum"
              className="rounded-xl border border-slate-700 bg-[#0d1322] px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
            >
              {isPt ? "Ver Fórum Completo →" : "Full Forum →"}
            </Link>
          </div>
        </div>

        {/* Composer */}
        <TimelineComposer
          locale={locale}
          categories={categories}
          onCreated={handleCreated}
        />

        {/* Filters & Sorting */}
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {FILTER_TABS.map((tab) => {
              const active = kindFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setKindFilter(tab.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
                      : "border-transparent bg-[#070b14] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {isPt ? tab.labelPt : tab.labelEn}
                </button>
              );
            })}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as TimelineSortMode)}
            aria-label={isPt ? "Ordenar timeline" : "Sort timeline"}
            className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
          >
            <option value="newest">
              {isPt ? "Mais recentes" : "Newest"}
            </option>
            <option value="trending">
              {isPt ? "Em alta" : "Trending"}
            </option>
            <option value="top_voted">
              {isPt ? "Mais votadas" : "Top voted"}
            </option>
          </select>
        </div>

        {/* Feed States */}
        {loading ? (
          <div className="space-y-4">
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
              className="mt-4 rounded-xl bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
            >
              {isPt ? "Tentar novamente" : "Retry"}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-10 text-center">
            <p className="text-sm text-slate-300">
              {isPt
                ? "Nenhuma publicação encontrada neste filtro ainda."
                : "No posts found for this filter yet."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isPt
                ? "Use o composer acima para iniciar uma discussão, fazer uma pergunta ou compartilhar uma ferramenta."
                : "Use the composer above to start a discussion, ask a question, or share a tool."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <TimelinePostCard
                key={item.id}
                post={item}
                locale={locale}
                currentUserId={user?.id ?? null}
                onVoteUpdated={handleVoteUpdated}
                onReplyAdded={handleReplyAdded}
              />
            ))}

            {hasMore && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void handleLoadMore()}
                  className="rounded-xl border border-slate-700 bg-[#0d1322] px-6 py-2.5 font-mono text-xs font-semibold text-cyan-300 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10 disabled:opacity-50"
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
    </section>
  );
}
