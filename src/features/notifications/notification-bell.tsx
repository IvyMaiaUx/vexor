"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { createClient } from "@/lib/supabase/client";
import {
  fetchUnreadNotificationCount,
  fetchUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "./notification-service";

interface NotificationBellProps {
  locale: SupportedLocale;
}

function getNotificationCopy(
  item: NotificationItem,
  locale: SupportedLocale
): string {
  const actor = item.actorUsername ? `@${item.actorUsername}` : "";
  if (locale === "pt-BR") {
    switch (item.type) {
      case "topic_reply":
        return `${actor} respondeu ao seu tópico no fórum.`;
      case "solution_accepted":
        return `${actor} marcou sua resposta como solução aceita.`;
      case "resource_approved":
        return "Seu recurso submetido ao catálogo foi aprovado.";
      case "resource_rejected":
        return "Seu recurso submetido ao catálogo foi revisado/rejeitado.";
      case "research_approved":
        return "Sua pesquisa de cibercrime foi aprovada e publicada.";
      case "research_rejected":
        return "Sua pesquisa de cibercrime foi revisada/rejeitada.";
      case "direct_message":
        return actor
          ? `${actor} enviou uma nova mensagem direta.`
          : "Você recebeu uma nova mensagem direta.";
      case "user_warning":
        return "Você recebeu um aviso da moderação.";
      case "mention":
        return `${actor} mencionou você em uma discussão.`;
      default:
        return "Você tem uma nova notificação.";
    }
  }
  switch (item.type) {
    case "topic_reply":
      return `${actor} replied to your forum topic.`;
    case "solution_accepted":
      return `${actor} marked your reply as the accepted solution.`;
    case "resource_approved":
      return "Your submitted catalog resource was approved.";
    case "resource_rejected":
      return "Your submitted catalog resource was reviewed/rejected.";
    case "research_approved":
      return "Your cybercrime research submission was approved and published.";
    case "research_rejected":
      return "Your cybercrime research submission was reviewed/rejected.";
    case "direct_message":
      return actor
        ? `${actor} sent you a direct message.`
        : "You received a new direct message.";
    case "user_warning":
      return "You received a moderation warning.";
    case "mention":
      return `${actor} mentioned you in a discussion.`;
    default:
      return "You have a new notification.";
  }
}

export function NotificationBell({ locale }: NotificationBellProps) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inFlightMarkRef = useRef(false);

  const refreshUnread = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    const res = await fetchUnreadNotificationCount();
    if (res.status === "success") {
      setUnreadCount(res.unreadCount);
    }
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setErrorMessage(null);
    const res = await fetchUserNotifications({ page: 1, pageSize: 10 });
    setLoading(false);
    if (res.status === "success") {
      setItems(res.items);
      void refreshUnread();
    } else if (res.status === "error") {
      setErrorMessage(
        res.errorMessage ??
          (locale === "pt-BR"
            ? "Erro ao carregar notificações."
            : "Error loading notifications.")
      );
    }
  }, [locale, refreshUnread, user?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      return;
    }
    const syncUnread = () => {
      void fetchUnreadNotificationCount().then((res) => {
        if (!cancelled && res.status === "success") {
          setUnreadCount(res.unreadCount);
        }
      });
    };
    syncUnread();

    // Realtime subscription with safe periodic polling fallback
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          syncUnread();
          if (open) {
            void loadNotifications();
          }
        }
      )
      .subscribe();

    const interval = setInterval(syncUnread, 25000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [loadNotifications, open, user?.id]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  if (!user) {
    return null;
  }

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      void loadNotifications();
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    setOpen(false);
    if (item.isRead) return;
    const res = await markNotificationAsRead(item.id);
    if (res.status === "success") {
      setItems((prev) =>
        prev.map((n) =>
          n.id === item.id
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAll = async () => {
    if (inFlightMarkRef.current || unreadCount === 0) return;
    inFlightMarkRef.current = true;
    setMarkingAll(true);
    try {
      const res = await markAllNotificationsAsRead();
      if (res.status === "success") {
        const now = new Date().toISOString();
        setItems((prev) =>
          prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt ?? now }))
        );
        setUnreadCount(0);
      } else {
        setErrorMessage(res.message);
      }
    } finally {
      inFlightMarkRef.current = false;
      setMarkingAll(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={locale === "pt-BR" ? "Notificações" : "Notifications"}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#0d1322] text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cyan-500 px-1 font-mono text-[10px] font-bold text-slate-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={locale === "pt-BR" ? "Notificações" : "Notifications"}
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-800 bg-[#0d1322] shadow-2xl sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-200">
              {locale === "pt-BR" ? "Notificações" : "Notifications"}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                disabled={markingAll}
                className="font-mono text-[11px] font-medium text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
              >
                {markingAll
                  ? "..."
                  : locale === "pt-BR"
                    ? "Marcar todas como lidas"
                    : "Mark all as read"}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                <div className="h-12 animate-pulse rounded-lg bg-slate-800/60" />
                <div className="h-12 animate-pulse rounded-lg bg-slate-800/60" />
              </div>
            ) : errorMessage ? (
              <div className="p-4 text-center">
                <p className="text-xs text-rose-300">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => void loadNotifications()}
                  className="mt-2 rounded-lg border border-rose-500/40 px-3 py-1 font-mono text-[11px] text-rose-200 hover:bg-rose-500/10"
                >
                  {locale === "pt-BR" ? "Tentar novamente" : "Retry"}
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {locale === "pt-BR"
                  ? "Nenhuma notificação no momento."
                  : "No notifications yet."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/80">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.targetHref}
                      onClick={() => void handleItemClick(item)}
                      className={`block px-4 py-3 transition-colors hover:bg-slate-800/40 ${
                        item.isRead ? "opacity-75" : "bg-cyan-500/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs leading-relaxed text-slate-200">
                          {getNotificationCopy(item, locale)}
                        </p>
                        {!item.isRead && (
                          <span
                            aria-label="Unread"
                            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400"
                          />
                        )}
                      </div>
                      <span className="mt-1 block font-mono text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString(
                          locale === "pt-BR" ? "pt-BR" : "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
