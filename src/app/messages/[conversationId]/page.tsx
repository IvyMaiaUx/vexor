"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { blockUser, unblockUser } from "@/features/messages/block-service";
import {
  type DmReportReason,
  editDirectMessage,
  fetchDmConversationDetail,
  markDmConversationRead,
  reportDirectMessage,
  sendDirectMessage,
  setDmConversationArchived,
  setDmConversationMuted,
} from "@/features/messages/dm-service";
import type {
  DmConversationSummary,
  DmMessageItem,
  DmMessagesCursor,
} from "@/features/messages/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";

const REPORT_REASONS: Array<{
  value: DmReportReason;
  labelPt: string;
  labelEn: string;
}> = [
  { value: "spam", labelPt: "Spam / Flood", labelEn: "Spam / Flood" },
  { value: "harassment", labelPt: "Assédio / Agressão", labelEn: "Harassment" },
  { value: "malicious_content", labelPt: "Conteúdo malicioso / Phishing", labelEn: "Malicious content / Phishing" },
  { value: "personal_data", labelPt: "Exposição de dados pessoais", labelEn: "Personal data exposure" },
  { value: "unauthorized_attack", labelPt: "Solicitação de ataque não autorizado", labelEn: "Unauthorized attack request" },
  { value: "other", labelPt: "Outro", labelEn: "Other" },
];

export default function ConversationDetailPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId =
    typeof params?.conversationId === "string" ? params.conversationId : "";

  const { locale, setLocale } = useCatalogStore();
  const { user, isLoading: authLoading } = useAuthStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [status, setStatus] = useState<
    "loading" | "ready" | "forbidden" | "not_found" | "error"
  >("loading");
  const [conversation, setConversation] =
    useState<DmConversationSummary | null>(null);
  const [messages, setMessages] = useState<DmMessageItem[]>([]);
  const [olderCursor, setOlderCursor] = useState<DmMessagesCursor | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [reportingMsgId, setReportingMsgId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<DmReportReason>("harassment");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [renderTimestamp] = useState(() => Date.now());

  const applyDetailResult = useCallback(
    (
      res: Awaited<ReturnType<typeof fetchDmConversationDetail>>,
      scrollToEnd: boolean
    ) => {
      if (res.status === "forbidden") {
        setStatus("forbidden");
        return;
      }
      if (res.status === "not_found" || !res.conversation) {
        setStatus("not_found");
        return;
      }
      if (res.status === "error") {
        setStatus("error");
        setErrorBanner(
          res.errorMessage ||
            (isPt ? "Erro ao carregar conversa." : "Error loading conversation.")
        );
        return;
      }

      setStatus("ready");
      setConversation(res.conversation);
      setMessages(res.messages);
      setOlderCursor(res.olderCursor);
      setHasOlder(res.hasOlder);
      setIsBlockedByMe(res.isBlockedByMe);
      void markDmConversationRead(conversationId, locale);

      if (scrollToEnd) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    },
    [conversationId, isPt, locale]
  );

  const loadConversation = useCallback(
    async (scrollToEnd = false) => {
      if (!conversationId || !user?.id) return;
      const res = await fetchDmConversationDetail(conversationId);
      applyDetailResult(res, scrollToEnd);
    },
    [applyDetailResult, conversationId, user?.id]
  );

  useEffect(() => {
    if (authLoading || !user?.id || !conversationId) return;
    let cancelled = false;
    void fetchDmConversationDetail(conversationId).then((res) => {
      if (!cancelled) applyDetailResult(res, true);
    });

    const supabase = createClient();
    const channel = supabase
      .channel(`dm-conv:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void loadConversation(false);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      void loadConversation(false);
    }, 12000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [applyDetailResult, authLoading, conversationId, loadConversation, user?.id]);

  const handleLoadOlder = async () => {
    if (!olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    const res = await fetchDmConversationDetail(conversationId, {
      cursor: olderCursor,
    });
    setLoadingOlder(false);
    if (res.status === "success") {
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const olderOnly = res.messages.filter((m) => !seen.has(m.id));
        return [...olderOnly, ...prev];
      });
      setOlderCursor(res.olderCursor);
      setHasOlder(res.hasOlder);
    }
  };

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending || !draft.trim()) return;
    setSending(true);
    setErrorBanner(null);

    try {
      const res = await sendDirectMessage(conversationId, draft, locale);
      if (res.status === "error") {
        setErrorBanner(res.message);
        return;
      }
      setDraft("");
      await loadConversation(true);
    } finally {
      setSending(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!conversation) return;
    setErrorBanner(null);
    setActionMessage(null);
    const targetId = conversation.otherParticipant.id;
    const res = isBlockedByMe
      ? await unblockUser(targetId, locale)
      : await blockUser(targetId, locale);

    if (res.status === "error") {
      setErrorBanner(res.message);
      return;
    }
    setIsBlockedByMe(res.data.blocked);
    setActionMessage(
      res.data.blocked
        ? isPt
          ? "Usuário bloqueado. Novas mensagens estão impedidas."
          : "User blocked. New messages are prevented."
        : isPt
          ? "Usuário desbloqueado."
          : "User unblocked."
    );
  };

  const handleToggleArchive = async () => {
    if (!conversation) return;
    setErrorBanner(null);
    const next = !conversation.isArchived;
    const res = await setDmConversationArchived(conversationId, next, locale);
    if (res.status === "error") {
      setErrorBanner(res.message);
      return;
    }
    setConversation((prev) => (prev ? { ...prev, isArchived: next } : prev));
    setActionMessage(
      next
        ? isPt
          ? "Conversa arquivada."
          : "Conversation archived."
        : isPt
          ? "Conversa restaurada."
          : "Conversation unarchived."
    );
  };

  const handleToggleMute = async () => {
    if (!conversation) return;
    setErrorBanner(null);
    const currentlyMuted = Boolean(
      conversation.mutedUntil &&
        new Date(conversation.mutedUntil).getTime() > Date.now()
    );
    const nextMutedUntil = currentlyMuted
      ? null
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const res = await setDmConversationMuted(
      conversationId,
      nextMutedUntil,
      locale
    );
    if (res.status === "error") {
      setErrorBanner(res.message);
      return;
    }
    setConversation((prev) =>
      prev ? { ...prev, mutedUntil: nextMutedUntil } : prev
    );
    setActionMessage(
      nextMutedUntil
        ? isPt
          ? "Conversa silenciada."
          : "Conversation muted."
        : isPt
          ? "Notificações reativadas."
          : "Conversation unmuted."
    );
  };

  const handleSaveEdit = async (messageId: string) => {
    setErrorBanner(null);
    const res = await editDirectMessage(messageId, editingBody, locale);
    if (res.status === "error") {
      setErrorBanner(res.message);
      return;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, body: editingBody.trim(), editedAt: res.data.editedAt }
          : m
      )
    );
    setEditingId(null);
    setEditingBody("");
  };

  const handleSubmitReport = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reportingMsgId || reportSubmitting) return;
    setReportSubmitting(true);
    setErrorBanner(null);
    try {
      const res = await reportDirectMessage(
        reportingMsgId,
        reportReason,
        reportDetails,
        locale
      );
      if (res.status === "error") {
        setErrorBanner(res.message);
        return;
      }
      setReportingMsgId(null);
      setReportDetails("");
      setActionMessage(
        isPt
          ? "Denúncia registrada com snapshot seguro para revisão da moderação."
          : "Report submitted with secure snapshot for moderation review."
      );
    } finally {
      setReportSubmitting(false);
    }
  };

  const isMuted = Boolean(
    conversation?.mutedUntil &&
      new Date(conversation.mutedUntil).getTime() > renderTimestamp
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/messages"
              className="font-mono text-xs text-cyan-400 hover:underline"
            >
              ← {isPt ? "Voltar à Caixa de Entrada" : "Back to Inbox"}
            </Link>
          </div>

          {status === "loading" ? (
            <div className="h-96 animate-pulse rounded-2xl border border-slate-800 bg-[#0d1322]/70" />
          ) : status === "forbidden" || status === "not_found" ? (
            <div className="rounded-2xl border border-rose-500/30 bg-[#0d1322] p-10 text-center">
              <p className="font-mono text-xs uppercase text-rose-300">
                {status === "forbidden" ? "403 · FORBIDDEN" : "404 · NOT_FOUND"}
              </p>
              <h1 className="mt-2 text-xl font-bold text-slate-100">
                {isPt
                  ? "Conversa indisponível"
                  : "Conversation unavailable"}
              </h1>
              <p className="mt-2 text-xs text-slate-400">
                {isPt
                  ? "Você não participa desta conversa ou ela não existe."
                  : "You are not a participant in this conversation or it does not exist."}
              </p>
              <Link
                href="/messages"
                className="mt-6 inline-block rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950"
              >
                {isPt ? "Ir para Mensagens" : "Go to Messages"}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 shadow-2xl">
              {/* Conversation Header */}
              {conversation && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-[#070b14]/80 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/profile/${conversation.otherParticipant.username}`}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-[#0d1322] font-mono text-xs font-bold text-cyan-300"
                    >
                      {(
                        conversation.otherParticipant.displayName ||
                        conversation.otherParticipant.username
                      )
                        .slice(0, 2)
                        .toUpperCase()}
                    </Link>
                    <div>
                      <Link
                        href={`/profile/${conversation.otherParticipant.username}`}
                        className="text-sm font-semibold text-slate-100 hover:text-cyan-300"
                      >
                        {conversation.otherParticipant.displayName ||
                          `@${conversation.otherParticipant.username}`}
                      </Link>
                      <p className="font-mono text-[11px] text-slate-500">
                        @{conversation.otherParticipant.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void markDmConversationRead(conversationId, locale)}
                      className="rounded-lg border border-slate-700 bg-[#0d1322] px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500/40"
                    >
                      {isPt ? "Marcar lida" : "Mark read"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleArchive()}
                      className="rounded-lg border border-slate-700 bg-[#0d1322] px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500/40"
                    >
                      {conversation.isArchived
                        ? isPt
                          ? "Desarquivar"
                          : "Unarchive"
                        : isPt
                          ? "Arquivar"
                          : "Archive"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleMute()}
                      className="rounded-lg border border-slate-700 bg-[#0d1322] px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500/40"
                    >
                      {isMuted
                        ? isPt
                          ? "Reativar som"
                          : "Unmute"
                        : isPt
                          ? "Silenciar"
                          : "Mute"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleBlock()}
                      className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] ${
                        isBlockedByMe
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                      }`}
                    >
                      {isBlockedByMe
                        ? isPt
                          ? "Desbloquear"
                          : "Unblock"
                        : isPt
                          ? "Bloquear"
                          : "Block"}
                    </button>
                  </div>
                </div>
              )}

              {(errorBanner || actionMessage) && (
                <div className="border-b border-slate-800/80 px-5 py-2.5">
                  {errorBanner && (
                    <p role="alert" className="text-xs text-rose-300">
                      {errorBanner}
                    </p>
                  )}
                  {actionMessage && (
                    <p role="status" className="text-xs text-cyan-300">
                      {actionMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Messages Thread */}
              <div className="max-h-[55vh] min-h-[320px] space-y-3 overflow-y-auto p-5">
                {hasOlder && (
                  <div className="text-center pb-2">
                    <button
                      type="button"
                      disabled={loadingOlder}
                      onClick={() => void handleLoadOlder()}
                      className="rounded-lg border border-slate-700 bg-[#070b14] px-3 py-1 font-mono text-[11px] text-cyan-300 hover:border-cyan-500/40"
                    >
                      {loadingOlder
                        ? "..."
                        : isPt
                          ? "Carregar mensagens anteriores"
                          : "Load older messages"}
                    </button>
                  </div>
                )}

                {messages.length === 0 ? (
                  <p className="py-12 text-center text-xs text-slate-500">
                    {isPt
                      ? "Nenhuma mensagem ainda. Envie a primeira!"
                      : "No messages yet. Send the first one!"}
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    const isEditing = editingId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMine ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl border px-4 py-2.5 text-sm ${
                            isMine
                              ? "border-cyan-500/40 bg-cyan-500/15 text-slate-100"
                              : "border-slate-800 bg-[#070b14] text-slate-200"
                          }`}
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                rows={2}
                                value={editingBody}
                                onChange={(e) => setEditingBody(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-[#0d1322] p-2 text-xs text-slate-100"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="text-[11px] text-slate-400"
                                >
                                  {isPt ? "Cancelar" : "Cancel"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveEdit(msg.id)}
                                  className="rounded bg-cyan-500 px-2.5 py-0.5 text-[11px] font-semibold text-slate-950"
                                >
                                  {isPt ? "Salvar" : "Save"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words leading-relaxed">
                              {msg.body}
                            </p>
                          )}

                          <div className="mt-1.5 flex items-center justify-end gap-2 font-mono text-[10px] text-slate-500">
                            {msg.editedAt && (
                              <span>{isPt ? "(editada)" : "(edited)"}</span>
                            )}
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString(
                                isPt ? "pt-BR" : "en-US",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </span>
                            {isMine && !isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(msg.id);
                                  setEditingBody(msg.body);
                                }}
                                className="text-slate-400 hover:text-cyan-300"
                              >
                                {isPt ? "Editar" : "Edit"}
                              </button>
                            )}
                            {!isMine && (
                              <button
                                type="button"
                                onClick={() => setReportingMsgId(msg.id)}
                                className="text-slate-400 hover:text-rose-300"
                              >
                                {isPt ? "Denunciar" : "Report"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Report Modal Inline */}
              {reportingMsgId && (
                <form
                  onSubmit={handleSubmitReport}
                  className="border-t border-rose-500/30 bg-rose-950/20 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-rose-200">
                      {isPt ? "Denunciar mensagem privada" : "Report private message"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReportingMsgId(null)}
                      className="text-xs text-slate-400"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <select
                      value={reportReason}
                      onChange={(e) =>
                        setReportReason(e.target.value as DmReportReason)
                      }
                      className="rounded-lg border border-slate-700 bg-[#070b14] px-3 py-1.5 text-xs text-slate-200"
                    >
                      {REPORT_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {isPt ? r.labelPt : r.labelEn}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      maxLength={500}
                      placeholder={
                        isPt ? "Detalhes opcionais..." : "Optional details..."
                      }
                      className="rounded-lg border border-slate-700 bg-[#070b14] px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={reportSubmitting}
                      className="rounded-lg bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
                    >
                      {reportSubmitting
                        ? "..."
                        : isPt
                          ? "Enviar denúncia"
                          : "Submit report"}
                    </button>
                  </div>
                </form>
              )}

              {/* Message Composer */}
              <form
                onSubmit={handleSend}
                className="flex items-end gap-2.5 border-t border-slate-800/80 bg-[#070b14]/80 p-4"
              >
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={isBlockedByMe}
                  maxLength={4000}
                  placeholder={
                    isBlockedByMe
                      ? isPt
                        ? "Usuário bloqueado. Desbloqueie para enviar mensagens."
                        : "User blocked. Unblock to send messages."
                      : isPt
                        ? "Escreva uma mensagem privada..."
                        : "Write a private message..."
                  }
                  className="flex-1 rounded-xl border border-slate-800 bg-[#0d1322] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={sending || isBlockedByMe || !draft.trim()}
                  className="rounded-xl bg-cyan-500 px-5 py-3 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 disabled:opacity-50"
                >
                  {sending ? "..." : isPt ? "Enviar" : "Send"}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
