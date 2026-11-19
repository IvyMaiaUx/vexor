"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import {
  createForumPost,
  fetchForumTopicDetail,
  type ForumPostItem,
} from "@/features/forum/forum-service";
import { MarkdownView } from "@/features/forum/markdown-view";
import { ReportButton } from "@/features/reports/report-modal";
import { getSafeExternalHref } from "@/lib/security/sanitize";
import { toggleTimelineTopicVote } from "./timeline-service";
import type { TimelinePostItem, TopicKind } from "./types";

interface TimelinePostCardProps {
  post: TimelinePostItem;
  locale: SupportedLocale;
  currentUserId: string | null;
  onVoteUpdated: (topicId: string, voted: boolean, delta: number) => void;
  onReplyAdded: (topicId: string) => void;
}

function getKindBadge(kind: TopicKind, isPt: boolean) {
  switch (kind) {
    case "question":
      return {
        label: isPt ? "Pergunta" : "Question",
        cls: "border-amber-500/30 bg-amber-500/10 text-amber-300",
      };
    case "tool_share":
      return {
        label: isPt ? "Ferramenta / Recurso" : "Tool / Resource",
        cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      };
    case "note":
      return {
        label: isPt ? "Nota" : "Note",
        cls: "border-purple-500/30 bg-purple-500/10 text-purple-300",
      };
    case "discussion":
    default:
      return {
        label: isPt ? "Discussão" : "Discussion",
        cls: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
      };
  }
}

function AuthorAvatar({
  avatarUrl,
  name,
  size = "md",
}: {
  avatarUrl?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl && failedUrl !== avatarUrl);
  const initials = (name || "VX").slice(0, 2).toUpperCase();
  const boxClass =
    size === "sm"
      ? "h-6 w-6 rounded-lg text-[10px]"
      : "h-10 w-10 rounded-xl text-xs";
  const px = size === "sm" ? 24 : 40;

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-cyan-500/30 bg-[#070b14] font-mono font-bold text-cyan-300 ${boxClass}`}
    >
      {showImage && avatarUrl ? (
        <Image
          key={avatarUrl}
          src={avatarUrl}
          alt={name}
          width={px}
          height={px}
          unoptimized
          onError={() => setFailedUrl(avatarUrl)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function TimelinePostCard({
  post,
  locale,
  currentUserId,
  onVoteUpdated,
  onReplyAdded,
}: TimelinePostCardProps) {
  const isPt = locale === "pt-BR";
  const kindBadge = getKindBadge(post.kind, isPt);
  const categoryName = isPt ? post.categoryNamePt : post.categoryNameEn;

  const [voting, setVoting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState<ForumPostItem[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const inFlightVote = useRef(false);
  const authorLabel = post.authorDisplayName || post.authorUsername || "VX";

  const handleToggleVote = async () => {
    if (inFlightVote.current) return;
    inFlightVote.current = true;
    setVoting(true);
    setActionFeedback(null);

    try {
      const wasVoted = post.userHasVoted;
      const res = await toggleTimelineTopicVote(post.id, wasVoted, locale);
      if (res.status === "error") {
        setActionFeedback(res.message);
        return;
      }
      const delta = res.data.voted ? (wasVoted ? 0 : 1) : wasVoted ? -1 : 0;
      onVoteUpdated(post.id, res.data.voted, delta);
    } finally {
      inFlightVote.current = false;
      setVoting(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/forum/${post.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionFeedback(
        isPt ? "Não foi possível copiar o link." : "Could not copy link."
      );
    }
  };

  const handleToggleComments = async () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments.length === 0) {
      setCommentsLoading(true);
      const detail = await fetchForumTopicDetail(post.id);
      setCommentsLoading(false);
      if (detail.status === "found") {
        setComments(detail.posts.slice(-5));
      }
    }
  };

  const handleSendComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (replySending || trimmed.length < 2) return;
    setReplySending(true);
    setActionFeedback(null);

    try {
      const res = await createForumPost({ topicId: post.id, body: trimmed });
      if (res.status === "error") {
        setActionFeedback(res.message);
        return;
      }
      setComments((prev) => [...prev, res.post]);
      setReplyText("");
      onReplyAdded(post.id);
    } finally {
      setReplySending(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6 shadow-lg transition-colors hover:border-slate-700/90">
      {/* Header: Author + Metadata */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/profile/${post.authorUsername}`}
            className="shrink-0 transition-opacity hover:opacity-90"
          >
            <AuthorAvatar
              avatarUrl={post.authorAvatarUrl}
              name={authorLabel}
              size="md"
            />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/profile/${post.authorUsername}`}
                className="text-sm font-semibold text-slate-100 hover:text-cyan-300"
              >
                {post.authorDisplayName || `@${post.authorUsername}`}
              </Link>
              <Link
                href={`/profile/${post.authorUsername}`}
                className="font-mono text-xs text-slate-500 hover:text-cyan-400"
              >
                @{post.authorUsername}
              </Link>
            </div>
            <p className="font-mono text-[11px] text-slate-500">
              {new Date(post.createdAt).toLocaleDateString(
                isPt ? "pt-BR" : "en-US",
                { day: "numeric", month: "short", year: "numeric" }
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${kindBadge.cls}`}
          >
            {kindBadge.label}
          </span>
          <Link
            href={`/forum?category=${post.categorySlug}`}
            className="rounded-md border border-slate-700/80 bg-[#070b14] px-2 py-0.5 font-mono text-[10px] text-slate-300 hover:border-cyan-500/40"
          >
            {categoryName}
          </Link>
        </div>
      </div>

      {/* Title & Tags */}
      <div className="mt-3.5">
        <h3 className="text-base font-bold text-slate-100 sm:text-lg">
          <Link
            href={`/forum/${post.id}`}
            className="transition-colors hover:text-cyan-300"
          >
            {post.title}
          </Link>
        </h3>

        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/forum?tag=${tag}`}
                className="rounded border border-slate-800 bg-[#070b14] px-2 py-0.5 font-mono text-[10px] text-cyan-300/90 hover:border-cyan-500/40"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Body Preview */}
      <div className="mt-3 line-clamp-6 text-sm text-slate-300">
        <MarkdownView content={post.body} />
      </div>

      {/* Shared URL or Linked Catalog Resource */}
      {(post.sharedUrl || post.linkedResource) && (
        <div className="mt-4 space-y-2">
          {post.linkedResource && (
            <Link
              href={`/catalog/${post.linkedResource.slug}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2.5 text-xs transition-colors hover:border-emerald-400/50"
            >
              <div className="min-w-0">
                <span className="font-mono text-[10px] uppercase text-emerald-300">
                  {isPt ? "Recurso do Catálogo" : "Catalog Resource"} ·{" "}
                  {post.linkedResource.type}
                </span>
                <p className="truncate font-semibold text-slate-100">
                  {post.linkedResource.name}
                </p>
              </div>
              <span className="shrink-0 font-mono text-emerald-300">→</span>
            </Link>
          )}

          {post.sharedUrl && (
            <a
              href={getSafeExternalHref(post.sharedUrl)}
              target="_blank"
              rel="noopener noreferrer ugc"
              className="block truncate rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2 font-mono text-xs text-cyan-400 hover:border-cyan-500/40 hover:underline"
            >
              {post.sharedUrl} ↗
            </a>
          )}
        </div>
      )}

      {/* Actions Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={voting}
            onClick={() => void handleToggleVote()}
            aria-pressed={post.userHasVoted}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
              post.userHasVoted
                ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-200"
                : "border-slate-800 bg-[#070b14] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
            }`}
          >
            <span>▲</span>
            <span>UP</span>
            <span>({post.voteCount})</span>
          </button>

          <button
            type="button"
            onClick={() => void handleToggleComments()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#070b14] px-3 py-1.5 font-mono text-xs text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
          >
            <span>
              {post.replyCount} {isPt ? "comentários" : "comments"}
            </span>
          </button>

          <Link
            href={`/forum/${post.id}`}
            className="rounded-lg border border-slate-800 bg-[#070b14] px-3 py-1.5 font-mono text-xs text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
          >
            {isPt ? "Abrir discussão" : "Open thread"} →
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleShare()}
            className="rounded-lg border border-slate-800 bg-[#070b14] px-2.5 py-1.5 font-mono text-[11px] text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
          >
            {copied
              ? isPt
                ? "Link copiado!"
                : "Link copied!"
              : isPt
                ? "Compartilhar"
                : "Share"}
          </button>

          {currentUserId !== post.authorId && (
            <ReportButton
              targetType="topic"
              targetId={post.id}
              locale={locale}
            />
          )}
        </div>
      </div>

      {actionFeedback && (
        <p className="mt-2 text-xs text-amber-300">{actionFeedback}</p>
      )}

      {/* Inline Quick Comments */}
      {commentsOpen && (
        <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-3">
          {commentsLoading ? (
            <p className="font-mono text-xs text-slate-500">
              {isPt ? "Carregando comentários..." : "Loading comments..."}
            </p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-500">
              {isPt
                ? "Nenhum comentário ainda. Seja o primeiro!"
                : "No comments yet. Be the first!"}
            </p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-800/80 bg-[#070b14] px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <Link
                      href={`/profile/${c.authorUsername}`}
                      className="inline-flex items-center gap-2 font-semibold text-cyan-300 hover:underline"
                    >
                      <AuthorAvatar
                        avatarUrl={c.authorAvatarUrl}
                        name={c.authorDisplayName || c.authorUsername}
                        size="sm"
                      />
                      <span>@{c.authorUsername}</span>
                    </Link>
                    <span className="font-mono text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString(
                        isPt ? "pt-BR" : "en-US"
                      )}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-slate-300">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!post.isLocked && (
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={4000}
                placeholder={
                  isPt ? "Escreva um comentário rápido..." : "Write a quick comment..."
                }
                className="flex-1 rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={replySending || replyText.trim().length < 2}
                className="rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {replySending ? "..." : isPt ? "Comentar" : "Reply"}
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
