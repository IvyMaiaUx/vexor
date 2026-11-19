"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { createClient } from "@/lib/supabase/client";
import { fetchDmConversations } from "./dm-service";

interface MessagesNavBadgeProps {
  locale: SupportedLocale;
  active?: boolean;
  onClick?: () => void;
  variant?: "desktop" | "mobile";
}

export function MessagesNavBadge({
  locale,
  active = false,
  onClick,
  variant = "desktop",
}: MessagesNavBadgeProps) {
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const isPt = locale === "pt-BR";

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      return;
    }

    const syncUnread = () => {
      void fetchDmConversations().then((res) => {
        if (!cancelled && res.status === "success") {
          setUnreadCount(res.unreadConversationCount);
        }
      });
    };

    syncUnread();

    const supabase = createClient();
    const channelName = `dm-badge:${user.id}:${Math.random().toString(36).slice(2, 10)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
          },
          () => {
            syncUnread();
          }
        )
        .subscribe();
    } catch {
      channel = null;
    }

    const interval = setInterval(syncUnread, 25000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  if (!user) return null;

  const label = isPt ? "Mensagens" : "Messages";

  if (variant === "mobile") {
    return (
      <Link
        href="/messages"
        onClick={onClick}
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
          active
            ? "bg-cyan-500/10 text-cyan-400"
            : "text-slate-300 hover:bg-slate-800/50"
        }`}
      >
        <span>{label}</span>
        {unreadCount > 0 && (
          <span className="rounded-full bg-cyan-500 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/messages"
      onClick={onClick}
      aria-label={label}
      className={`relative inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400 ${
        active ? "text-cyan-400" : "text-slate-300"
      }`}
    >
      <span>{label}</span>
      {unreadCount > 0 && (
        <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cyan-500 px-1 font-mono text-[10px] font-bold text-slate-950">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
