import type { SupportedLocale } from "@/config/site";
import { createClient } from "@/lib/supabase/client";
import type { DmMutationResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockSupabaseClientLike = any;

export interface BlockedUserEntry {
  blockedId: string;
  username: string;
  displayName: string | null;
  createdAt: string;
}

function getClient(override?: BlockSupabaseClientLike): BlockSupabaseClientLike {
  return override ?? createClient();
}

export async function isUserBlockedByMe(
  targetUserId: string,
  options?: { client?: BlockSupabaseClientLike }
): Promise<boolean> {
  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !targetUserId) return false;

    const { data, error } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", targetUserId)
      .maybeSingle();

    return !error && Boolean(data);
  } catch {
    return false;
  }
}

export async function fetchBlockedUsers(options?: {
  client?: BlockSupabaseClientLike;
}): Promise<BlockedUserEntry[]> {
  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return [];

    const { data, error } = await supabase
      .from("user_blocks")
      .select("blocked_id, created_at")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !Array.isArray(data) || data.length === 0) return [];
    const rows = data as Array<{ blocked_id: string; created_at: string }>;
    const ids = rows.map((r) => r.blocked_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ids);

    const map = new Map<string, { username: string; display_name: string | null }>();
    ((profiles ?? []) as Array<{ id: string; username: string; display_name: string | null }>).forEach(
      (p) => map.set(p.id, p)
    );

    return rows.map((r) => {
      const p = map.get(r.blocked_id);
      return {
        blockedId: r.blocked_id,
        username: p?.username ?? "vexor_member",
        displayName: p?.display_name ?? null,
        createdAt: r.created_at,
      };
    });
  } catch {
    return [];
  }
}

export async function blockUser(
  targetUserId: string,
  locale: SupportedLocale,
  options?: { client?: BlockSupabaseClientLike }
): Promise<DmMutationResult<{ blocked: true }>> {
  const isPt = locale === "pt-BR";
  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: isPt ? "Faça login para bloquear usuários." : "Sign in to block users.",
      };
    }
    if (!targetUserId || targetUserId === user.id) {
      return {
        status: "error",
        errorCode: "validation_error",
        message: isPt ? "Usuário alvo inválido." : "Invalid target user.",
      };
    }

    const { error } = await supabase
      .from("user_blocks")
      .insert({ blocked_id: targetUserId });

    if (error && error.code !== "23505") {
      return {
        status: "error",
        errorCode: error.code === "42501" ? "forbidden" : "mutation_failed",
        message: error.message || (isPt ? "Não foi possível bloquear." : "Could not block user."),
      };
    }

    return { status: "success", data: { blocked: true } };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

export async function unblockUser(
  targetUserId: string,
  locale: SupportedLocale,
  options?: { client?: BlockSupabaseClientLike }
): Promise<DmMutationResult<{ blocked: false }>> {
  const isPt = locale === "pt-BR";
  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: isPt ? "Faça login para desbloquear." : "Sign in to unblock.",
      };
    }

    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", targetUserId);

    if (error) {
      return {
        status: "error",
        errorCode: error.code === "42501" ? "forbidden" : "mutation_failed",
        message: error.message || (isPt ? "Não foi possível desbloquear." : "Could not unblock user."),
      };
    }

    return { status: "success", data: { blocked: false } };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}
