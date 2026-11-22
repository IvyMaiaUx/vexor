"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import {
  getPricingModelLabel,
  getResourceTagLabel,
} from "@/features/catalog/pricing-labels";
import { ReportButton } from "@/features/reports/report-modal";
import { getSafeExternalHref } from "@/lib/security/sanitize";
import { toggleTimelineTopicVote } from "./timeline-service";
import type { TimelinePostItem } from "./types";

interface TimelinePostCardProps {
  post: TimelinePostItem;
  locale: SupportedLocale;
  currentUserId: string | null;
  canModerate?: boolean;
  onVoteUpdated: (topicId: string, voted: boolean, delta: number) => void;
  onEdit?: (post: TimelinePostItem) => void;
  onRequestDelete?: (
    post: TimelinePostItem,
    triggerEl: HTMLElement | null
  ) => void;
}

function formatRelativeTime(iso: string, isPt: boolean): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return isPt ? "agora" : "now";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return date.toLocaleDateString(isPt ? "pt-BR" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

function stripMarkdownSummary(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[#>*\-\d.]+\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function AuthorAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl?: string | null;
  name: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl && failedUrl !== avatarUrl);
  const initial = (name || "V").slice(0, 1).toUpperCase();

  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-500/30 bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
      {showImage && avatarUrl ? (
        <Image
          key={avatarUrl}
          src={avatarUrl}
          alt={name}
          width={40}
          height={40}
          unoptimized
          onError={() => setFailedUrl(avatarUrl)}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}

export function TimelinePostCard({
  post,
  locale,
  currentUserId,
  canModerate = false,
  onVoteUpdated,
  onEdit,
  onRequestDelete,
}: TimelinePostCardProps) {
  const router = useRouter();
  const isPt = locale === "pt-BR";
  const categoryName = isPt ? post.categoryNamePt : post.categoryNameEn;
  const authorLabel = post.authorDisplayName || post.authorUsername || "V";
  const summaryText = stripMarkdownSummary(post.body);

  const [voting, setVoting] = useState(false);
  // TODO(backend): persistir bookmark de posts da timeline quando existir tabela de post_bookmarks
  const [savedLocal, setSavedLocal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const inFlightVote = useRef(false);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const isAuthor = Boolean(currentUserId && currentUserId === post.authorId);
  const canEdit = isAuthor && !post.isLocked;
  const canDelete = (isAuthor && !post.isLocked) || canModerate;

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const stop = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleOpenPost = () => {
    router.push(`/forum/${post.id}`);
  };

  const handleToggleVote = async (e: MouseEvent) => {
    e.stopPropagation();
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

  const handleShare = async (e: MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/forum/${post.id}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: post.title, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // User cancelled share sheet or clipboard denied
    }
  };

  const safeSharedHref = post.sharedUrl ? getSafeExternalHref(post.sharedUrl) : null;
  let sharedDomain = "";
  if (safeSharedHref) {
    try {
      sharedDomain = new URL(safeSharedHref).hostname.replace(/^www\./, "");
    } catch {
      sharedDomain = safeSharedHref;
    }
  }

  const roleBadge =
    post.authorRole === "admin"
      ? "ADMIN"
      : post.authorRole === "moderator"
        ? "MOD"
        : null;

  return (
    <article
      onClick={handleOpenPost}
      className="cursor-pointer rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-4 transition-colors hover:border-slate-700/90 sm:p-5"
    >
      {/* Header: Avatar + @username + role + relative time · community + more */}
      <div className="flex items-center gap-2.5">
        <Link
          href={`/profile/${post.authorUsername}`}
          onClick={stop}
          className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          aria-label={`@${post.authorUsername}`}
        >
          <AuthorAvatar avatarUrl={post.authorAvatarUrl} name={authorLabel} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/profile/${post.authorUsername}`}
              onClick={stop}
              className="truncate font-mono text-sm font-semibold text-emerald-400 hover:underline"
            >
              @{post.authorUsername}
            </Link>
            {roleBadge && (
              <span className="inline-flex h-[18px] items-center rounded border border-indigo-500/40 bg-indigo-500/15 px-1.5 font-mono text-[10px] font-semibold uppercase text-indigo-300">
                {roleBadge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            <span>{formatRelativeTime(post.createdAt, isPt)}</span>
            {post.editedAt && (
              <>
                <span className="mx-1">·</span>
                <span className="text-slate-500">
                  {isPt ? "editado" : "edited"}
                </span>
              </>
            )}
            <span className="mx-1">·</span>
            <span className="text-cyan-400">{categoryName}</span>
          </p>
        </div>

        <div className="relative" onClick={stop}>
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={isPt ? "Mais opções da publicação" : "Post options"}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
          >
            <span aria-hidden="true" className="text-lg font-bold leading-none">
              ⋯
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-11 z-20 min-w-[176px] rounded-xl border border-slate-800 bg-[#070b14] p-1.5 shadow-xl"
            >
              {canEdit && onEdit && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(post);
                  }}
                  className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-xs font-medium text-slate-200 hover:bg-slate-800/70"
                >
                  {isPt ? "Editar" : "Edit"}
                </button>
              )}
              {canDelete && onRequestDelete && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onRequestDelete(post, menuTriggerRef.current);
                  }}
                  className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-xs font-semibold text-rose-300 hover:bg-rose-500/15"
                >
                  {isPt ? "Excluir" : "Delete"}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  setMenuOpen(false);
                  void handleShare(e);
                }}
                className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-xs font-medium text-slate-200 hover:bg-slate-800/70"
              >
                {isPt ? "Copiar link" : "Copy link"}
              </button>
              {!isAuthor && !canModerate && (
                <div className="px-1 py-0.5">
                  <ReportButton
                    targetType="topic"
                    targetId={post.id}
                    locale={locale}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title + 2-line Summary */}
      <h3 className="mt-2.5 text-base font-semibold leading-snug text-slate-100">
        <Link
          href={`/forum/${post.id}`}
          onClick={stop}
          className="hover:text-cyan-300 focus:outline-none focus-visible:underline"
        >
          {post.title}
        </Link>
      </h3>

      {summaryText && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-400">
          {summaryText}
        </p>
      )}

      {/* Embedded Resource Mini-Card */}
      {post.linkedResource ? (
        <Link
          href={`/catalog/${post.linkedResource.slug}`}
          onClick={stop}
          className="mt-3 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#070b14] p-2.5 transition-colors hover:border-cyan-500/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
            {post.linkedResource.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-100">
              {post.linkedResource.name}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {post.linkedResource.pricingModel && (
                <span className="inline-flex h-[22px] items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 font-mono text-[11px] font-semibold text-emerald-400">
                  {getPricingModelLabel(post.linkedResource.pricingModel, locale)}
                </span>
              )}
              {post.linkedResource.requiresCreditCard === "no" && (
                <span className="inline-flex h-[22px] items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 font-mono text-[11px] font-semibold text-emerald-400">
                  {getResourceTagLabel("no_card", locale)}
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 text-slate-400" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
            >
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
          </span>
        </Link>
      ) : safeSharedHref ? (
        <a
          href={safeSharedHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          className="mt-3 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#070b14] p-2.5 transition-colors hover:border-cyan-500/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
            {(sharedDomain || "L").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-100">
              {sharedDomain}
            </div>
            <div className="truncate font-mono text-[11px] text-slate-400">
              {safeSharedHref}
            </div>
          </div>
          <span className="shrink-0 text-slate-400" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
            >
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
          </span>
        </a>
      ) : null}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="inline-flex h-[22px] items-center rounded-md border border-slate-800 bg-[#070b14]/70 px-2 font-mono text-[11px] font-medium text-slate-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Action Bar */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-1">
        <button
          type="button"
          disabled={voting}
          onClick={(e) => void handleToggleVote(e)}
          aria-pressed={post.userHasVoted}
          aria-label={isPt ? "Votar na publicação" : "Upvote post"}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors disabled:opacity-50 ${
            post.userHasVoted
              ? "text-cyan-400"
              : "text-slate-400 hover:text-slate-200"
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
            className="h-[18px] w-[18px]"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          <span>{post.voteCount}</span>
        </button>

        <Link
          href={`/forum/${post.id}#comments`}
          onClick={stop}
          aria-label={isPt ? "Comentários" : "Comments"}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" />
          </svg>
          <span>{post.replyCount}</span>
        </Link>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSavedLocal((prev) => !prev);
          }}
          aria-pressed={savedLocal}
          aria-label={isPt ? "Salvar" : "Save"}
          className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2 transition-colors ${
            savedLocal
              ? "text-cyan-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill={savedLocal ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={(e) => void handleShare(e)}
          aria-label={isPt ? "Compartilhar" : "Share"}
          className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-lg px-2 text-xs transition-colors ${
            copied
              ? "text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
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
            className="h-[18px] w-[18px]"
          >
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
          </svg>
          {copied && <span>{isPt ? "Copiado" : "Copied"}</span>}
        </button>
      </div>

      {actionFeedback && (
        <p className="mt-1.5 text-xs text-amber-300" onClick={stop}>
          {actionFeedback}
        </p>
      )}
    </article>
  );
}
