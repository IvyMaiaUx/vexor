"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import {
  fetchDmConversations,
  getOrCreateDmConversation,
  searchMembersForDm,
} from "@/features/messages/dm-service";
import type {
  DmConversationSummary,
  DmParticipantProfile,
} from "@/features/messages/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";

export default function MessagesInboxPage() {
  const router = useRouter();
  const { locale, setLocale } = useCatalogStore();
  const { user, isLoading: authLoading } = useAuthStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [conversations, setConversations] = useState<DmConversationSummary[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [renderTimestamp] = useState(() => Date.now());

  const loading = authLoading || (Boolean(user?.id) && loadedUserId !== user?.id);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<DmParticipantProfile[]>([]);
  const [startingUserId, setStartingUserId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const currentUserId = user?.id ?? null;

  const loadInbox = useCallback(async () => {
    if (!currentUserId) return;
    const res = await fetchDmConversations();
    if (res.status === "error") {
      setErrorMessage(
        res.errorMessage ||
          (isPt
            ? "Não foi possível carregar suas mensagens."
            : "Could not load your messages.")
      );
    } else {
      setErrorMessage(null);
      setConversations(res.items);
    }
    setLoadedUserId(currentUserId);
  }, [currentUserId, isPt]);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    let cancelled = false;
    void fetchDmConversations().then((res) => {
      if (cancelled) return;
      if (res.status === "error") {
        setErrorMessage(
          res.errorMessage ||
            (isPt
              ? "Não foi possível carregar suas mensagens."
              : "Could not load your messages.")
        );
      } else {
        setErrorMessage(null);
        setConversations(res.items);
      }
      setLoadedUserId(user.id);
    });

    const supabase = createClient();
    const channelName = `dm-inbox:${user.id}:${Math.random().toString(36).slice(2, 10)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "direct_messages" },
          () => {
            void loadInbox();
          }
        )
        .subscribe();
    } catch {
      channel = null;
    }

    const interval = setInterval(() => {
      void loadInbox();
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [authLoading, isPt, loadInbox, user?.id]);

  useEffect(() => {
    if (!newChatOpen) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchMembersForDm(memberSearch).then((rows) => {
        if (!cancelled) setMemberResults(rows);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [memberSearch, newChatOpen]);

  const handleStartConversation = async (targetUserId: string) => {
    if (startingUserId) return;
    setStartingUserId(targetUserId);
    setStartError(null);
    try {
      const res = await getOrCreateDmConversation(targetUserId, locale);
      if (res.status === "error") {
        setStartError(res.message);
        return;
      }
      router.push(`/messages/${res.data.conversationId}`);
    } finally {
      setStartingUserId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return conversations.filter((c) => {
      if (tab === "archived" && !c.isArchived) return false;
      if (tab === "active" && c.isArchived) return false;
      if (!q) return true;
      return (
        c.otherParticipant.username.toLowerCase().includes(q) ||
        (c.otherParticipant.displayName ?? "").toLowerCase().includes(q) ||
        (c.lastMessageBody ?? "").toLowerCase().includes(q)
      );
    });
  }, [conversations, searchTerm, tab]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
                {isPt ? "MENSAGENS PRIVADAS · 1:1" : "PRIVATE MESSAGES · 1:1"}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                {isPt ? "Caixa de Entrada" : "Inbox"}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => {
                setStartError(null);
                setNewChatOpen((v) => !v);
              }}
              className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400"
            >
              {newChatOpen
                ? isPt
                  ? "Fechar"
                  : "Close"
                : isPt
                  ? "+ Nova conversa"
                  : "+ New conversation"}
            </button>
          </div>

          {newChatOpen && (
            <section className="rounded-2xl border border-cyan-500/30 bg-[#0d1322]/95 p-5 space-y-3">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
                {isPt ? "Iniciar conversa privada" : "Start private conversation"}
              </h2>
              <input
                type="search"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder={
                  isPt
                    ? "Buscar membro por @username..."
                    : "Search member by @username..."
                }
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
              />
              {startError && (
                <p role="alert" className="text-xs text-rose-300">
                  {startError}
                </p>
              )}
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/70 rounded-xl border border-slate-800 bg-[#070b14]">
                {memberResults.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500">
                    {isPt ? "Nenhum membro encontrado." : "No members found."}
                  </p>
                ) : (
                  memberResults.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-4 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-100">
                          {member.displayName || `@${member.username}`}
                        </span>
                        <span className="ml-2 font-mono text-slate-500">
                          @{member.username}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={startingUserId === member.id}
                        onClick={() => void handleStartConversation(member.id)}
                        className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
                      >
                        {startingUserId === member.id
                          ? "..."
                          : isPt
                            ? "Conversar →"
                            : "Message →"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Search & Active/Archived Tabs */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#0d1322]/90 p-3.5 sm:flex-row sm:items-center">
            <div className="flex gap-1.5" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "active"}
                onClick={() => setTab("active")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  tab === "active"
                    ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
                    : "border-transparent bg-[#070b14] text-slate-400 hover:text-slate-200"
                }`}
              >
                {isPt ? "Ativas" : "Active"}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "archived"}
                onClick={() => setTab("archived")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  tab === "archived"
                    ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
                    : "border-transparent bg-[#070b14] text-slate-400 hover:text-slate-200"
                }`}
              >
                {isPt ? "Arquivadas" : "Archived"}
              </button>
            </div>

            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isPt ? "Buscar conversas..." : "Search conversations..."
              }
              aria-label={isPt ? "Buscar conversas" : "Search conversations"}
              className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:w-64"
            />
          </div>

          {/* Conversations List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-[#0d1322]/70"
                />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center">
              <p className="text-sm text-rose-200">{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadInbox()}
                className="mt-4 rounded-xl bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200"
              >
                {isPt ? "Tentar novamente" : "Retry"}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/70 p-12 text-center">
              <p className="text-sm text-slate-300">
                {tab === "archived"
                  ? isPt
                    ? "Nenhuma conversa arquivada."
                    : "No archived conversations."
                  : isPt
                    ? "Nenhuma conversa encontrada."
                    : "No conversations found."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {isPt
                  ? "Clique em '+ Nova conversa' ou visite o perfil de um membro para iniciar um chat privado."
                  : "Click '+ New conversation' or visit a member's profile to start a private chat."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {filtered.map((conv) => {
                const initials = (
                  conv.otherParticipant.displayName ||
                  conv.otherParticipant.username ||
                  "VX"
                )
                  .slice(0, 2)
                  .toUpperCase();
                const isMuted = Boolean(
                  conv.mutedUntil &&
                    new Date(conv.mutedUntil).getTime() > renderTimestamp
                );

                return (
                  <li key={conv.id}>
                    <Link
                      href={`/messages/${conv.id}`}
                      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                        conv.hasUnread
                          ? "border-cyan-500/50 bg-cyan-950/20 hover:bg-cyan-950/30"
                          : "border-slate-800/90 bg-[#0d1322]/90 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-[#070b14] font-mono text-xs font-bold text-cyan-300">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-100">
                              {conv.otherParticipant.displayName ||
                                `@${conv.otherParticipant.username}`}
                            </span>
                            <span className="font-mono text-xs text-slate-500">
                              @{conv.otherParticipant.username}
                            </span>
                            {conv.hasUnread && (
                              <span className="rounded-full bg-cyan-500 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-950">
                                {isPt ? "Nova" : "Unread"}
                              </span>
                            )}
                            {conv.isArchived && (
                              <span className="rounded border border-slate-700 bg-[#070b14] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                                {isPt ? "Arquivada" : "Archived"}
                              </span>
                            )}
                            {isMuted && (
                              <span className="rounded border border-slate-700 bg-[#070b14] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                                {isPt ? "Silenciada" : "Muted"}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {conv.lastMessageBody
                              ? conv.lastMessageBody
                              : isPt
                                ? "Conversa iniciada — envie a primeira mensagem."
                                : "Conversation started — send the first message."}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 font-mono text-[11px] text-slate-500">
                        {new Date(conv.lastMessageAt).toLocaleDateString(
                          isPt ? "pt-BR" : "en-US",
                          { day: "2-digit", month: "short" }
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
