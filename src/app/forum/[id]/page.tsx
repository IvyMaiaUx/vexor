"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ConfirmDeleteSheet } from "@/components/ui/confirm-delete-sheet";
import { UndoToast } from "@/components/ui/undo-toast";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { describeForumMutationError } from "@/features/forum/barrier-messages";
import {
  createForumPost,
  fetchForumTopicDetail,
  type ForumPostItem,
  type ForumTopicItem,
  restoreForumPost,
  restoreForumTopic,
  setAcceptedForumPost,
  softDeleteForumPost,
  softDeleteForumTopic,
  togglePostVote,
  updateForumPost,
  updateForumTopic,
} from "@/features/forum/forum-service";
import { MarkdownView } from "@/features/forum/markdown-view";
import { useForumStore } from "@/features/forum/use-forum-store";
import { validateNewReply } from "@/features/forum/validation";
import {
  fetchFollowStats,
  toggleFollowUser,
} from "@/features/profile/follow-service";
import { ReportButton } from "@/features/reports/report-modal";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function TopicDetailPage() {
  const params = useParams<{ id: string }>();
  const topicId = typeof params?.id === "string" ? params.id : "";

  const { locale, setLocale } = useCatalogStore();
  const { user, isActiveMember, isModerator } = useAuthStore();
  const { categories, categoriesLoading } = useForumStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const [topic, setTopic] = useState<ForumTopicItem | null>(null);
  const [posts, setPosts] = useState<ForumPostItem[]>([]);
  const [votedPostIds, setVotedPostIds] = useState<string[]>([]);
  const [detailStatus, setDetailStatus] = useState<
    "found" | "not_found" | "error"
  >("found");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [retryToken, setRetryToken] = useState(0);

  const [replyBody, setReplyBody] = useState("");
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replySuccessMessage, setReplySuccessMessage] = useState(false);
  const [replySort, setReplySort] = useState<"top" | "newest" | "oldest">(
    "top"
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [followingAuthor, setFollowingAuthor] = useState(false);
  const [followAuthorBusy, setFollowAuthorBusy] = useState(false);

  useEffect(() => {
    if (!topic?.authorId || !user?.id || topic.authorId === user.id) return;
    let cancelled = false;
    void fetchFollowStats(topic.authorId, user.id).then((stats) => {
      if (!cancelled) setFollowingAuthor(stats.isFollowing);
    });
    return () => {
      cancelled = true;
    };
  }, [topic?.authorId, user?.id]);

  const handleToggleFollowAuthor = async () => {
    if (!topic?.authorId || followAuthorBusy) return;
    setFollowAuthorBusy(true);
    const prev = followingAuthor;
    setFollowingAuthor(!prev);
    const res = await toggleFollowUser(topic.authorId, prev, locale);
    setFollowAuthorBusy(false);
    if (res.status === "error") {
      setFollowingAuthor(prev);
    }
  };
  const mobileReplyInputRef = useRef<HTMLInputElement | null>(null);

  // Edit own topic state
  const [editingTopic, setEditingTopic] = useState(false);
  const [editTopicTitle, setEditTopicTitle] = useState("");
  const [editTopicCategoryId, setEditTopicCategoryId] = useState("");
  const [editTopicBody, setEditTopicBody] = useState("");
  const [editTopicSaving, setEditTopicSaving] = useState(false);

  // Edit own post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostBody, setEditPostBody] = useState("");
  const [editPostSaving, setEditPostSaving] = useState(false);

  // Overflow menus ("⋯") + soft delete & 8s undo state
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const deleteTriggerRef = useRef<HTMLElement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "topic"; topic: ForumTopicItem }
    | { kind: "post"; post: ForumPostItem }
    | null
  >(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [topicDeleted, setTopicDeleted] = useState(false);
  const [undoState, setUndoState] = useState<
    | { kind: "topic"; topic: ForumTopicItem }
    | { kind: "post"; post: ForumPostItem; index: number; wasPlaceholder: boolean }
    | null
  >(null);
  const [undoing, setUndoing] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);

  const inFlightReplyRef = useRef(false);
  const inFlightVotesRef = useRef<Set<string>>(new Set());
  const inFlightAcceptRef = useRef(false);
  const inFlightTopicEditRef = useRef(false);
  const inFlightPostEditRef = useRef(false);

  const currentKey = `${topicId}|${categories.length}|${user?.id ?? "anon"}|${retryToken}`;
  const isLoading = categoriesLoading || loadedKey !== currentKey;

  useEffect(() => {
    if (categoriesLoading) {
      return;
    }

    let cancelled = false;

    void fetchForumTopicDetail(topicId, { categories }).then((res) => {
      if (cancelled) {
        return;
      }
      setDetailStatus(res.status);
      setTopic(res.topic);
      setPosts(res.posts);
      setVotedPostIds(res.votedPostIds);
      setDetailError(res.errorMessage ?? null);
      setLoadedKey(currentKey);
    });

    return () => {
      cancelled = true;
    };
  }, [categories, categoriesLoading, currentKey, topicId]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.slug, c])),
    [categories]
  );

  const topicCategory = topic ? categoryMap.get(topic.categorySlug) : undefined;
  const topicCategoryName = topicCategory
    ? locale === "pt-BR"
      ? topicCategory.name_pt
      : topicCategory.name_en
    : topic?.categorySlug ?? "";

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const aAccepted = a.id === topic?.acceptedPostId;
      const bAccepted = b.id === topic?.acceptedPostId;
      if (aAccepted !== bAccepted) {
        return aAccepted ? -1 : 1;
      }
      if (replySort === "top") {
        return b.voteCount - a.voteCount;
      }
      if (replySort === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return (
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, [posts, topic?.acceptedPostId, replySort]);

  const toggleVote = useCallback(
    async (post: ForumPostItem) => {
      if (!user || !isActiveMember) {
        setActionError(
          locale === "pt-BR"
            ? "Faça login com uma conta ativa para votar."
            : "Sign in with an active account to vote."
        );
        return;
      }
      if (user.id === post.authorId) {
        setActionError(
          locale === "pt-BR"
            ? "Você não pode votar na sua própria resposta."
            : "You cannot vote on your own reply."
        );
        return;
      }
      if (inFlightVotesRef.current.has(post.id)) {
        return;
      }

      setActionError(null);
      inFlightVotesRef.current.add(post.id);
      const currentlyVoted = votedPostIds.includes(post.id);

      try {
        const result = await togglePostVote(post.id, currentlyVoted);
        if (result.status === "error") {
          setActionError(result.message);
          return;
        }

        setVotedPostIds((prev) =>
          result.voted
            ? Array.from(new Set([...prev, post.id]))
            : prev.filter((id) => id !== post.id)
        );
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, voteCount: result.voteCount } : p
          )
        );
      } finally {
        inFlightVotesRef.current.delete(post.id);
      }
    },
    [isActiveMember, locale, user, votedPostIds]
  );

  const setAcceptedSolution = useCallback(
    async (nextPostId: string | null) => {
      if (!topic || inFlightAcceptRef.current) {
        return;
      }
      setActionError(null);
      inFlightAcceptRef.current = true;

      try {
        const result = await setAcceptedForumPost(topic.id, nextPostId);
        if (result.status === "error") {
          setActionError(result.message);
          return;
        }
        setTopic((prev) =>
          prev ? { ...prev, acceptedPostId: result.acceptedPostId } : prev
        );
        setPosts((prev) =>
          prev.map((p) => ({
            ...p,
            isAcceptedSolution: p.id === result.acceptedPostId,
          }))
        );
      } finally {
        inFlightAcceptRef.current = false;
      }
    },
    [topic]
  );

  const handleStartEditTopic = () => {
    if (!topic) return;
    setEditTopicTitle(topic.title);
    setEditTopicCategoryId(topic.categoryId);
    setEditTopicBody(topic.body);
    setEditingTopic(true);
    setActionError(null);
  };

  const handleSaveTopicEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!topic || inFlightTopicEditRef.current) return;

    setActionError(null);
    inFlightTopicEditRef.current = true;
    setEditTopicSaving(true);

    try {
      const result = await updateForumTopic(
        topic.id,
        {
          title: editTopicTitle,
          body: editTopicBody,
          categoryId: editTopicCategoryId,
        },
        { categories }
      );

      if (result.status === "error") {
        setActionError(result.message);
        return;
      }

      setTopic(result.topic);
      setEditingTopic(false);
    } finally {
      inFlightTopicEditRef.current = false;
      setEditTopicSaving(false);
    }
  };

  const handleSavePostEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPostId || inFlightPostEditRef.current) return;

    setActionError(null);
    inFlightPostEditRef.current = true;
    setEditPostSaving(true);

    try {
      const result = await updateForumPost(editingPostId, {
        body: editPostBody,
      });
      if (result.status === "error") {
        setActionError(result.message);
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === result.post.id
            ? {
                ...result.post,
                isAcceptedSolution: p.isAcceptedSolution,
              }
            : p
        )
      );
      setEditingPostId(null);
      setEditPostBody("");
    } finally {
      inFlightPostEditRef.current = false;
      setEditPostSaving(false);
    }
  };

  useEffect(() => {
    if (!openMenuKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuKey(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openMenuKey]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError(null);

    if (deleteTarget.kind === "topic") {
      const res = await softDeleteForumTopic(deleteTarget.topic.id);
      setDeleteLoading(false);
      if (res.status === "error") {
        setDeleteError(res.message);
        return;
      }
      const deletedTopic = deleteTarget.topic;
      setDeleteTarget(null);
      setTopicDeleted(true);
      setUndoError(null);
      setUndoState({ kind: "topic", topic: deletedTopic });
      return;
    }

    const targetPost = deleteTarget.post;
    const res = await softDeleteForumPost(targetPost.id);
    setDeleteLoading(false);
    if (res.status === "error") {
      setDeleteError(res.message);
      return;
    }

    const idx = posts.findIndex((p) => p.id === targetPost.id);
    if (res.hasReplies) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === targetPost.id
            ? {
                ...p,
                authorId: null,
                authorUsername: "",
                authorDisplayName: undefined,
                authorAvatarUrl: null,
                body: "",
                editedAt: null,
                deletedAt: res.deletedAt,
                isDeletedPlaceholder: true,
              }
            : p
        )
      );
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== targetPost.id));
    }
    setTopic((prev) =>
      prev ? { ...prev, replyCount: Math.max(0, prev.replyCount - 1) } : prev
    );
    setDeleteTarget(null);
    setUndoError(null);
    setUndoState({
      kind: "post",
      post: targetPost,
      index: idx >= 0 ? idx : posts.length,
      wasPlaceholder: res.hasReplies,
    });
  };

  const handleUndoDelete = async () => {
    if (!undoState || undoing) return;
    setUndoing(true);
    setUndoError(null);

    if (undoState.kind === "topic") {
      const res = await restoreForumTopic(undoState.topic.id);
      setUndoing(false);
      if (res.status === "error") {
        setUndoError(res.message);
        return;
      }
      setTopicDeleted(false);
      setUndoState(null);
      return;
    }

    const { post, index, wasPlaceholder } = undoState;
    const res = await restoreForumPost(post.id);
    setUndoing(false);
    if (res.status === "error") {
      setUndoError(res.message);
      return;
    }

    setPosts((prev) => {
      if (wasPlaceholder) {
        return prev.map((p) => (p.id === post.id ? post : p));
      }
      if (prev.some((p) => p.id === post.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, post);
      return next;
    });
    setTopic((prev) =>
      prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev
    );
    setUndoState(null);
  };

  const handleReplySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!topic || !isActiveMember || !user || inFlightReplyRef.current) {
      return;
    }

    const validation = validateNewReply(replyBody, dict);
    if (!validation.valid) {
      setReplyError(validation.error ?? "Invalid reply");
      return;
    }

    setReplyError(null);
    inFlightReplyRef.current = true;
    setReplySubmitting(true);

    try {
      const result = await createForumPost({
        topicId: topic.id,
        body: replyBody.trim(),
      });

      if (result.status === "error") {
        setReplyError(describeForumMutationError(result, dict));
        return;
      }

      setPosts((prev) => [...prev, result.post]);
      setTopic((prev) =>
        prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev
      );
      setReplyBody("");
      setReplySuccessMessage(true);
      setTimeout(() => setReplySuccessMessage(false), 4000);
    } finally {
      inFlightReplyRef.current = false;
      setReplySubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} onLocaleChange={setLocale} dict={dict} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-4" aria-busy="true">
            <div className="h-8 w-1/3 animate-pulse rounded-lg bg-[#0d1322]" />
            <div className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-[#0d1322]/70" />
            <div className="h-32 animate-pulse rounded-2xl border border-slate-800 bg-[#0d1322]/70" />
          </div>
        </main>
        <Footer locale={locale} dict={dict} />
      </div>
    );
  }

  if (detailStatus === "error") {
    return (
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} onLocaleChange={setLocale} dict={dict} />
        <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/25 px-4 py-3 text-sm text-rose-200">
            {detailError ??
              (locale === "pt-BR"
                ? "Erro ao carregar este tópico."
                : "Error loading this topic.")}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setRetryToken((t) => t + 1)}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              {locale === "pt-BR" ? "Tentar novamente" : "Retry"}
            </button>
            <Link
              href="/forum"
              className="rounded-xl border border-slate-700 bg-[#0d1322] px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-500/40"
            >
              ← {dict.topicDetailPage.backToForum}
            </Link>
          </div>
        </main>
        <Footer locale={locale} dict={dict} />
      </div>
    );
  }

  if (detailStatus === "not_found" || !topic) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} onLocaleChange={setLocale} dict={dict} />
        <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <span className="rounded-full border border-slate-800 bg-[#0d1322] px-3 py-1 font-mono text-xs text-cyan-400">
            404 · TOPIC_NOT_FOUND
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-100 sm:text-3xl">
            {dict.forumPage.noTopicsFound}
          </h1>
          <Link
            href="/forum"
            className="mt-6 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            ← {dict.topicDetailPage.backToForum}
          </Link>
        </main>
        <Footer locale={locale} dict={dict} />
      </div>
    );
  }

  const canEditTopic =
    Boolean(user) &&
    !user?.isSuspended &&
    !topic.isLocked &&
    user?.id === topic.authorId;

  const canManageAcceptedAnswer =
    Boolean(user) &&
    !user?.isSuspended &&
    ((!topic.isLocked && user?.id === topic.authorId) || isModerator);

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-4 pb-24 sm:py-10 lg:pb-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Mobile Back to Feed */}
          <div className="mb-2 sm:hidden">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-slate-200 transition-colors hover:text-cyan-300"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-cyan-400"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
              <span>
                {locale === "pt-BR" ? "Voltar ao feed" : "Back to feed"}
              </span>
            </Link>
          </div>

          {/* Breadcrumb Navigation (sm+) */}
          <nav
            aria-label="Breadcrumb"
            className="hidden flex-wrap items-center gap-2 font-mono text-xs text-slate-400 sm:flex"
          >
            <Link
              href="/forum"
              className="transition-colors hover:text-cyan-400"
            >
              {dict.nav.forum}
            </Link>
            <span>/</span>
            <Link
              href={`/forum?category=${topic.categorySlug}`}
              className="text-slate-300 transition-colors hover:text-cyan-400"
            >
              {topicCategoryName}
            </Link>
            <span>/</span>
            <span className="max-w-[200px] truncate text-cyan-300 sm:max-w-md">
              {topic.title}
            </span>
          </nav>

          {actionError && (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/25 px-4 py-3 text-xs font-medium text-rose-200">
              {actionError}
            </div>
          )}

          {/* Topic Header Card */}
          <article className="mt-6 rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-6 shadow-xl sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/forum?category=${topic.categorySlug}`}
                  className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs font-medium text-cyan-300 transition-colors hover:border-cyan-500/60"
                >
                  {topicCategoryName}
                </Link>

                {topic.isPinned && (
                  <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-amber-300">
                    📌 {dict.forumPage.pinnedBadge}
                  </span>
                )}

                {topic.isLocked && (
                  <span className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-rose-300">
                    🔒 {dict.forumPage.lockedBadge}
                  </span>
                )}

                {topic.acceptedPostId && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    ✓ {dict.forumSection.solvedBadge}
                  </span>
                )}
              </div>

              <div className="relative flex items-center gap-2">
                {!editingTopic && (
                  <>
                    <button
                      type="button"
                      aria-label={
                        locale === "pt-BR"
                          ? "Mais opções da publicação"
                          : "Post options"
                      }
                      aria-expanded={openMenuKey === "topic"}
                      aria-haspopup="menu"
                      onClick={(e) => {
                        deleteTriggerRef.current = e.currentTarget;
                        setOpenMenuKey((prev) =>
                          prev === "topic" ? null : "topic"
                        );
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-slate-200"
                    >
                      <span aria-hidden="true" className="text-lg font-bold leading-none">
                        ⋯
                      </span>
                    </button>

                    {openMenuKey === "topic" && (
                      <div
                        role="menu"
                        className="absolute right-0 top-12 z-20 min-w-[176px] rounded-xl border border-slate-800 bg-[#070b14] p-1.5 shadow-xl"
                      >
                        {canEditTopic && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuKey(null);
                              handleStartEditTopic();
                            }}
                            className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-xs font-medium text-slate-200 hover:bg-slate-800/70"
                          >
                            {locale === "pt-BR" ? "Editar" : "Edit"}
                          </button>
                        )}
                        {(canEditTopic || isModerator) && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuKey(null);
                              setDeleteError(null);
                              setDeleteTarget({ kind: "topic", topic });
                            }}
                            className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-xs font-semibold text-rose-300 hover:bg-rose-500/15"
                          >
                            {locale === "pt-BR" ? "Excluir" : "Delete"}
                          </button>
                        )}
                        {user?.id !== topic.authorId && !isModerator && (
                          <div className="px-1 py-0.5">
                            <ReportButton
                              targetType="topic"
                              targetId={topic.id}
                              locale={locale}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {editingTopic ? (
              <form onSubmit={handleSaveTopicEdit} className="mt-5 space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase text-slate-400">
                    {dict.newTopicPage.titleLabel}
                  </label>
                  <input
                    type="text"
                    value={editTopicTitle}
                    onChange={(e) => setEditTopicTitle(e.target.value)}
                    minLength={5}
                    maxLength={200}
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs uppercase text-slate-400">
                    {dict.newTopicPage.categoryLabel}
                  </label>
                  <select
                    value={editTopicCategoryId}
                    onChange={(e) => setEditTopicCategoryId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {locale === "pt-BR" ? cat.name_pt : cat.name_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-xs uppercase text-slate-400">
                    {dict.newTopicPage.bodyLabel}
                  </label>
                  <textarea
                    rows={8}
                    value={editTopicBody}
                    onChange={(e) => setEditTopicBody(e.target.value)}
                    minLength={10}
                    maxLength={20000}
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] p-3.5 font-mono text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTopic(false)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100"
                  >
                    {dict.newTopicPage.cancelButton}
                  </button>
                  <button
                    type="submit"
                    disabled={editTopicSaving}
                    className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {editTopicSaving
                      ? "..."
                      : locale === "pt-BR"
                        ? "Salvar alterações"
                        : "Save changes"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                  {topic.title}
                </h1>

                {/* Author info & publication timestamp */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <Link
                    href={`/profile/${topic.authorUsername}`}
                    className="font-mono font-semibold text-emerald-400 transition-colors hover:underline"
                  >
                    @{topic.authorUsername}
                  </Link>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {new Date(topic.createdAt).toLocaleDateString(
                      locale === "pt-BR" ? "pt-BR" : "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </span>
                  {topic.editedAt && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {locale === "pt-BR" ? "editado" : "edited"}
                      </span>
                    </>
                  )}
                  {user && user.id !== topic.authorId && (
                    <button
                      type="button"
                      disabled={followAuthorBusy}
                      onClick={() => void handleToggleFollowAuthor()}
                      aria-pressed={followingAuthor}
                      className={`ml-auto inline-flex min-h-[38px] items-center rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
                        followingAuthor
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                          : "border-slate-700 bg-[#070b14] text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300"
                      }`}
                    >
                      {followingAuthor
                        ? locale === "pt-BR"
                          ? "Seguindo"
                          : "Following"
                        : locale === "pt-BR"
                          ? "Seguir"
                          : "Follow"}
                    </button>
                  )}
                </div>

                {/* Topic Tags (right below title & author) */}
                {topic.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {topic.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/forum?tag=${tag}`}
                        className="rounded-md border border-cyan-500/20 bg-[#070b14] px-2.5 py-1 font-mono text-[11px] text-cyan-300/90 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-200"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Topic Body (Rendered via Safe Markdown) */}
                <div className="mt-6 border-t border-slate-800/80 pt-6">
                  <MarkdownView content={topic.body} />
                </div>
              </>
            )}
          </article>

          {/* Locked Notice */}
          {topic.isLocked && (
            <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs leading-relaxed text-rose-300">
              🔒 {dict.topicDetailPage.lockedNotice}
            </div>
          )}

          {/* Replies Section Header */}
          <section id="comments" className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <h2 className="text-xl font-bold text-slate-100">
                {dict.topicDetailPage.repliesTitle(
                  sortedPosts.filter((p) => !p.isDeletedPlaceholder).length
                )}
              </h2>

              {sortedPosts.length > 1 && (
                <div className="flex items-center gap-2">
                  <select
                    value={replySort}
                    onChange={(e) =>
                      setReplySort(
                        e.target.value as "top" | "newest" | "oldest"
                      )
                    }
                    className="rounded-lg border border-slate-800 bg-[#0d1322] px-3 py-1.5 font-mono text-xs text-slate-300 focus:border-cyan-500/60 focus:outline-none"
                  >
                    <option value="top">
                      {dict.topicDetailPage.sortRepliesTop}
                    </option>
                    <option value="newest">
                      {dict.topicDetailPage.sortRepliesNewest}
                    </option>
                    <option value="oldest">
                      {dict.topicDetailPage.sortRepliesOldest}
                    </option>
                  </select>
                </div>
              )}
            </div>

            {/* Replies List */}
            {sortedPosts.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-slate-800/80 bg-[#0d1322]/60 p-8 text-center text-sm text-slate-400">
                {dict.topicDetailPage.noRepliesYet}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {sortedPosts.map((post) => {
                  const isAccepted = post.id === topic.acceptedPostId;
                  const isVoted = votedPostIds.includes(post.id);
                  const isOwnPost = Boolean(user && user.id === post.authorId);
                  const canEditPost =
                    isOwnPost && !user?.isSuspended && !topic.isLocked;
                  const canDeletePost = canEditPost || isModerator;
                  const isEditingThisPost = editingPostId === post.id;
                  const isNestedReply =
                    Boolean(post.parentPostId) ||
                    /^@[a-z0-9_]{2,30}\b/i.test(post.body.trim());

                  if (post.isDeletedPlaceholder) {
                    return (
                      <article
                        key={post.id}
                        id={`post-${post.id}`}
                        className={`rounded-2xl border border-slate-800/70 bg-[#0d1322]/50 px-4 py-3 text-sm italic text-slate-500 sm:px-6 ${
                          isNestedReply ? "ml-6 sm:ml-10" : ""
                        }`}
                      >
                        {locale === "pt-BR"
                          ? "[comentário removido]"
                          : "[comment removed]"}
                      </article>
                    );
                  }

                  const postMenuKey = `post-${post.id}`;

                  return (
                    <article
                      key={post.id}
                      id={`post-${post.id}`}
                      className={`rounded-2xl border p-4 transition-all sm:p-6 ${
                        isNestedReply ? "ml-6 sm:ml-10" : ""
                      } ${
                        isAccepted
                          ? "border-emerald-500/50 bg-gradient-to-br from-[#0d1322] via-[#09151c] to-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.12)]"
                          : "border-slate-800/90 bg-[#0d1322]/90"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/profile/${post.authorUsername}`}
                            className="font-mono text-xs font-semibold text-emerald-400 transition-colors hover:underline"
                          >
                            @{post.authorUsername}
                          </Link>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {new Date(post.createdAt).toLocaleDateString(
                              locale === "pt-BR" ? "pt-BR" : "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          {post.editedAt && (
                            <>
                              <span className="text-xs text-slate-500">•</span>
                              <span className="font-mono text-[11px] text-slate-500">
                                {locale === "pt-BR" ? "editado" : "edited"}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Badges / Management actions */}
                        <div className="relative flex flex-wrap items-center gap-2">
                          {isAccepted && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-300">
                              ✓ {dict.topicDetailPage.acceptedSolutionBadge}
                            </span>
                          )}

                          {!isEditingThisPost && (
                            <div className="relative">
                              <button
                                type="button"
                                aria-label={
                                  locale === "pt-BR"
                                    ? "Mais opções do comentário"
                                    : "Comment options"
                                }
                                aria-expanded={openMenuKey === postMenuKey}
                                aria-haspopup="menu"
                                onClick={(e) => {
                                  deleteTriggerRef.current = e.currentTarget;
                                  setOpenMenuKey((prev) =>
                                    prev === postMenuKey ? null : postMenuKey
                                  );
                                }}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-slate-200"
                              >
                                <span
                                  aria-hidden="true"
                                  className="text-lg font-bold leading-none"
                                >
                                  ⋯
                                </span>
                              </button>

                              {openMenuKey === postMenuKey && (
                                <div
                                  role="menu"
                                  className="absolute right-0 top-12 z-20 min-w-[168px] rounded-xl border border-slate-800 bg-[#070b14] p-1.5 shadow-xl"
                                >
                                  {canEditPost && (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenMenuKey(null);
                                        setEditingPostId(post.id);
                                        setEditPostBody(post.body);
                                      }}
                                      className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-xs font-medium text-slate-200 hover:bg-slate-800/70"
                                    >
                                      {locale === "pt-BR" ? "Editar" : "Edit"}
                                    </button>
                                  )}
                                  {canDeletePost && (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenMenuKey(null);
                                        setDeleteError(null);
                                        setDeleteTarget({ kind: "post", post });
                                      }}
                                      className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-xs font-semibold text-rose-300 hover:bg-rose-500/15"
                                    >
                                      {locale === "pt-BR" ? "Excluir" : "Delete"}
                                    </button>
                                  )}
                                  {!isOwnPost && !isModerator && (
                                    <div className="px-1 py-0.5">
                                      <ReportButton
                                        targetType="post"
                                        targetId={post.id}
                                        locale={locale}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {canManageAcceptedAnswer && (
                            <button
                              type="button"
                              onClick={() =>
                                void setAcceptedSolution(
                                  isAccepted ? null : post.id
                                )
                              }
                              className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                                isAccepted
                                  ? "border-slate-700 bg-slate-900 text-slate-300 hover:text-rose-300"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              }`}
                            >
                              {isAccepted
                                ? dict.topicDetailPage.unmarkAccepted
                                : `✓ ${dict.topicDetailPage.markAsAccepted}`}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Post body / edit form */}
                      {isEditingThisPost ? (
                        <form
                          onSubmit={handleSavePostEdit}
                          className="mt-4 space-y-3"
                        >
                          <textarea
                            rows={5}
                            required
                            maxLength={10000}
                            value={editPostBody}
                            onChange={(e) => setEditPostBody(e.target.value)}
                            className="w-full rounded-xl border border-slate-800 bg-[#070b14] p-3 font-mono text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPostId(null);
                                setEditPostBody("");
                              }}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300"
                            >
                              {dict.newTopicPage.cancelButton}
                            </button>
                            <button
                              type="submit"
                              disabled={editPostSaving}
                              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                            >
                              {editPostSaving
                                ? "..."
                                : locale === "pt-BR"
                                  ? "Salvar"
                                  : "Save"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-4">
                          <MarkdownView content={post.body} />
                        </div>
                      )}

                      {/* Vote & Reply actions */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleVote(post)}
                            disabled={isOwnPost}
                            title={
                              isOwnPost
                                ? locale === "pt-BR"
                                  ? "Você não pode votar na própria resposta"
                                  : "You cannot vote on your own reply"
                                : undefined
                            }
                            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 font-mono text-xs font-medium transition-colors ${
                              isOwnPost
                                ? "cursor-not-allowed border-slate-800/60 bg-[#070b14]/60 text-slate-500"
                                : isVoted
                                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                                  : "border-slate-800 bg-[#070b14] text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300"
                            }`}
                          >
                            <span>▲</span>
                            <span>{post.voteCount}</span>
                          </button>

                          {user && !user.isSuspended && !topic.isLocked && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyBody((prev) =>
                                  prev.startsWith(`@${post.authorUsername} `)
                                    ? prev
                                    : `@${post.authorUsername} ${prev}`
                                );
                                mobileReplyInputRef.current?.focus();
                              }}
                              className="inline-flex min-h-[40px] items-center rounded-lg px-2.5 text-xs font-medium text-slate-400 transition-colors hover:text-cyan-300"
                            >
                              {locale === "pt-BR" ? "Responder" : "Reply"}
                            </button>
                          )}
                        </div>
                        {!isOwnPost && (
                          <ReportButton
                            targetType="post"
                            targetId={post.id}
                            locale={locale}
                          />
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Reply Form / Auth Gate */}
          <section className="mt-12">
            {!user ? (
              <div className="rounded-2xl border border-cyan-500/30 bg-[#0d1322]/90 p-8 text-center shadow-lg">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  🔒 {dict.topicDetailPage.authRequiredToReply}
                </span>
                <div className="mt-5">
                  <Link
                    href={`/login?next=/forum/${topic.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    {dict.topicDetailPage.loginToReply} →
                  </Link>
                </div>
              </div>
            ) : user.isSuspended ? (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-6 text-center text-xs text-rose-300">
                ⛔ {dict.topicDetailPage.suspendedReplyBlocked}
              </div>
            ) : topic.isLocked ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 text-center text-xs text-slate-400">
                🔒 {dict.topicDetailPage.lockedNotice}
              </div>
            ) : (
              <form
                onSubmit={handleReplySubmit}
                className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-6 sm:p-8"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-semibold text-slate-100">
                    {dict.topicDetailPage.replyFormTitle}
                  </h3>

                  {/* Tabs: Write vs. Preview */}
                  <div className="flex items-center rounded-lg border border-slate-800 bg-[#070b14] p-0.5">
                    <button
                      type="button"
                      onClick={() => setEditorTab("write")}
                      className={`rounded px-2.5 py-1 text-xs font-medium ${
                        editorTab === "write"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {dict.topicDetailPage.writeTab}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab("preview")}
                      className={`rounded px-2.5 py-1 text-xs font-medium ${
                        editorTab === "preview"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {dict.topicDetailPage.previewTab}
                    </button>
                  </div>
                </div>

                {editorTab === "write" ? (
                  <div className="mt-4">
                    <textarea
                      rows={6}
                      required
                      maxLength={10000}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={dict.topicDetailPage.replyPlaceholder}
                      className="w-full rounded-xl border border-slate-800 bg-[#070b14] p-3.5 font-mono text-base leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>{dict.topicDetailPage.replyHint}</span>
                      <span className="font-mono">
                        {replyBody.trim().length} / 10000
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 min-h-[160px] rounded-xl border border-slate-800 bg-[#070b14] p-4">
                    {replyBody.trim() ? (
                      <MarkdownView content={replyBody} />
                    ) : (
                      <p className="text-xs italic text-slate-500">
                        (Nada para visualizar ainda...)
                      </p>
                    )}
                  </div>
                )}

                {replyError && (
                  <p className="mt-2 text-xs font-medium text-rose-400">
                    {replyError}
                  </p>
                )}

                {replySuccessMessage && (
                  <p className="mt-2 text-xs font-medium text-emerald-400">
                    ✓ {dict.topicDetailPage.replySuccess}
                  </p>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={replySubmitting}
                    className="rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {replySubmitting
                      ? "..."
                      : dict.topicDetailPage.sendReplyButton}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>

      {/* Fixed Bottom Mobile Comment Bar (< lg) */}
      {user && !user.isSuspended && !topic.isLocked && (
        <form
          onSubmit={handleReplySubmit}
          className="fixed inset-x-0 bottom-[74px] z-30 flex items-center gap-2 border-t border-slate-800/90 bg-[#070b14]/95 px-4 py-2.5 backdrop-blur-md lg:hidden"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300"
          >
            {(user.displayName || user.username || "V")
              .slice(0, 1)
              .toUpperCase()}
          </span>
          <label className="min-w-0 flex-1">
            <span className="sr-only">
              {locale === "pt-BR" ? "Escreva um comentário" : "Write a comment"}
            </span>
            <input
              ref={mobileReplyInputRef}
              type="text"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              maxLength={10000}
              placeholder={
                locale === "pt-BR"
                  ? "Escreva um comentário…"
                  : "Write a comment…"
              }
              className="min-h-[44px] w-full rounded-full border border-slate-800 bg-[#0d1322] px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={replySubmitting || replyBody.trim().length < 2}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-cyan-500 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50"
          >
            {replySubmitting
              ? "..."
              : locale === "pt-BR"
                ? "Enviar"
                : "Send"}
          </button>
        </form>
      )}

      {topicDeleted && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#070b14]/95 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d1322] p-6 text-center">
            <h2 className="text-lg font-semibold text-slate-100">
              {locale === "pt-BR"
                ? "Publicação excluída"
                : "Post deleted"}
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              {locale === "pt-BR"
                ? "Você pode tocar em Desfazer abaixo nos próximos segundos ou voltar para a comunidade."
                : "You can tap Undo below within the next few seconds or return to the community."}
            </p>
            <div className="mt-5 flex justify-center">
              <Link
                href="/forum"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                {locale === "pt-BR" ? "Voltar ao Fórum" : "Back to Forum"}
              </Link>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteSheet
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === "topic"
            ? locale === "pt-BR"
              ? "Excluir esta publicação?"
              : "Delete this post?"
            : locale === "pt-BR"
              ? "Excluir este comentário?"
              : "Delete this comment?"
        }
        description={
          deleteTarget?.kind === "topic"
            ? locale === "pt-BR"
              ? "Os comentários dela também deixam de aparecer."
              : "Its comments will also stop appearing."
            : undefined
        }
        confirmLabel={locale === "pt-BR" ? "Excluir" : "Delete"}
        cancelLabel={locale === "pt-BR" ? "Cancelar" : "Cancel"}
        loadingLabel={locale === "pt-BR" ? "Excluindo..." : "Deleting..."}
        retryLabel={locale === "pt-BR" ? "Tentar novamente" : "Try again"}
        loading={deleteLoading}
        errorMessage={deleteError}
        returnFocusTo={deleteTriggerRef}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />

      <UndoToast
        open={Boolean(undoState)}
        message={
          undoState?.kind === "topic"
            ? locale === "pt-BR"
              ? "Publicação excluída."
              : "Post deleted."
            : locale === "pt-BR"
              ? "Comentário excluído."
              : "Comment deleted."
        }
        undoLabel={locale === "pt-BR" ? "Desfazer" : "Undo"}
        dismissLabel={locale === "pt-BR" ? "Fechar aviso" : "Dismiss"}
        retryLabel={locale === "pt-BR" ? "Tentar novamente" : "Try again"}
        undoing={undoing}
        errorMessage={undoError}
        durationMs={8000}
        onUndo={handleUndoDelete}
        onDismiss={() => {
          setUndoState(null);
          setUndoError(null);
        }}
      />

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
