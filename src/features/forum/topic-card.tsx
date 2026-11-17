"use client";

import Link from "next/link";
import type { CategoryItem, SupportedLocale } from "@/config/site";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ForumTopicItem } from "./forum-service";

interface TopicCardProps {
  topic: ForumTopicItem;
  category?: CategoryItem;
  locale: SupportedLocale;
  dict: Dictionary;
  onTagClick?: (tag: string) => void;
}

export function TopicCard({
  topic,
  category,
  locale,
  dict,
  onTagClick,
}: TopicCardProps) {
  const categoryName = category
    ? locale === "pt-BR"
      ? category.name_pt
      : category.name_en
    : topic.categorySlug;

  const hasSolution = Boolean(topic.acceptedPostId);

  return (
    <article className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4.5 transition-all hover:border-cyan-500/40 hover:bg-[#11192d] sm:flex-row sm:items-center sm:p-5">
      <div className="min-w-0 flex-1 space-y-2.5">
        {/* Badges strip */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Link
            href={`/forum?category=${topic.categorySlug}`}
            className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-cyan-300 transition-colors hover:border-cyan-500/60"
          >
            {categoryName}
          </Link>

          {topic.isPinned && (
            <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              📌 {dict.forumPage.pinnedBadge}
            </span>
          )}

          {topic.isLocked && (
            <span className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-300">
              🔒 {dict.forumPage.lockedBadge}
            </span>
          )}

          {hasSolution && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              ✓ {dict.forumSection.solvedBadge}
            </span>
          )}

          <span className="font-mono text-[11px] text-slate-500">
            {dict.forumSection.byAuthor}{" "}
            <Link
              href={`/profile/${topic.authorUsername}`}
              className="text-slate-400 hover:text-cyan-300 hover:underline"
            >
              @{topic.authorUsername}
            </Link>
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-100 transition-colors group-hover:text-cyan-300 sm:text-lg">
          <Link
            href={`/forum/${topic.id}`}
            className="focus:outline-none focus-visible:underline"
          >
            {topic.title}
          </Link>
        </h3>

        {/* Tags */}
        {topic.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topic.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="rounded border border-slate-800 bg-[#070b14] px-2 py-0.5 font-mono text-[10px] text-slate-400 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Replies counter */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-800/80 pt-3 sm:flex-col sm:items-end sm:gap-1.5 sm:border-0 sm:pt-0">
        <div className="rounded-lg border border-slate-800 bg-[#070b14] px-3 py-1 font-mono text-xs text-slate-300">
          <span className="font-semibold text-cyan-300">{topic.replyCount}</span>{" "}
          <span className="text-[11px] text-slate-400">
            {dict.forumSection.repliesLabel}
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          {new Date(topic.lastActivityAt).toLocaleDateString(
            locale === "pt-BR" ? "pt-BR" : "en-US",
            { month: "short", day: "numeric" }
          )}
        </span>
      </div>
    </article>
  );
}
