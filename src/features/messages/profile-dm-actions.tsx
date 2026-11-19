"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import { blockUser, isUserBlockedByMe, unblockUser } from "./block-service";
import { getOrCreateDmConversation } from "./dm-service";

interface ProfileDmActionsProps {
  targetUserId: string;
  targetUsername: string;
  locale: SupportedLocale;
}

export function ProfileDmActions({
  targetUserId,
  targetUsername,
  locale,
}: ProfileDmActionsProps) {
  const router = useRouter();
  const isPt = locale === "pt-BR";

  const [opening, setOpening] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [togglingBlock, setTogglingBlock] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isUserBlockedByMe(targetUserId).then((res) => {
      if (!cancelled) setBlocked(res);
    });
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  const handleOpenChat = async () => {
    if (opening) return;
    setOpening(true);
    setErrorMessage(null);
    try {
      const res = await getOrCreateDmConversation(targetUserId, locale);
      if (res.status === "error") {
        setErrorMessage(res.message);
        return;
      }
      router.push(`/messages/${res.data.conversationId}`);
    } finally {
      setOpening(false);
    }
  };

  const handleToggleBlock = async () => {
    if (togglingBlock) return;
    setTogglingBlock(true);
    setErrorMessage(null);
    try {
      const res = blocked
        ? await unblockUser(targetUserId, locale)
        : await blockUser(targetUserId, locale);
      if (res.status === "error") {
        setErrorMessage(res.message);
        return;
      }
      setBlocked(res.data.blocked);
    } finally {
      setTogglingBlock(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-slate-400">
        {isPt
          ? `Interagir com @${targetUsername}`
          : `Interact with @${targetUsername}`}
        {errorMessage && (
          <p role="alert" className="mt-1 text-rose-300">
            {errorMessage}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={opening || blocked}
          onClick={() => void handleOpenChat()}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.2)] transition-colors hover:bg-cyan-400 disabled:opacity-50"
        >
          {opening
            ? isPt
              ? "Abrindo..."
              : "Opening..."
            : isPt
              ? "Enviar mensagem"
              : "Send message"}
        </button>

        <button
          type="button"
          disabled={togglingBlock}
          onClick={() => void handleToggleBlock()}
          className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${
            blocked
              ? "border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
          }`}
        >
          {togglingBlock
            ? "..."
            : blocked
              ? isPt
                ? "Desbloquear usuário"
                : "Unblock user"
              : isPt
                ? "Bloquear usuário"
                : "Block user"}
        </button>
      </div>
    </div>
  );
}
