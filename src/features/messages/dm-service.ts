import type { SupportedLocale } from "@/config/site";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { isUserBlockedByMe } from "./block-service";
import type {
  DmConversationDetailResult,
  DmConversationSummary,
  DmMessageItem,
  DmMessagesCursor,
  DmMutationResult,
  DmParticipantProfile,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DmSupabaseClientLike = any;

export type DmReportReason = Database["public"]["Enums"]["report_reason"];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getClient(override?: DmSupabaseClientLike): DmSupabaseClientLike {
  return override ?? createClient();
}

function isMissingRpcError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = (err.code ?? "").toUpperCase();
  const msg = (err.message ?? "").toLowerCase();
  return code === "PGRST202" || code === "42883" || msg.includes("could not find the function");
}

function mapDmRpcError(
  err: { code?: string; message?: string } | null,
  isPt: boolean
): { errorCode: "forbidden" | "blocked_or_suspended" | "rate_limited" | "duplicate_report" | "not_found" | "migration_pending" | "mutation_failed"; message: string } {
  const code = (err?.code ?? "").toUpperCase();
  const msg = (err?.message ?? "").toLowerCase();

  if (code === "42901" || msg.includes("rate_limit")) {
    return {
      errorCode: "rate_limited",
      message: isPt
        ? "Limite de envio atingido (máx. 30 mensagens/minuto). Aguarde um instante."
        : "Rate limit reached (max 30 messages/minute). Please wait a moment.",
    };
  }
  if (code === "23505") {
    return {
      errorCode: "duplicate_report",
      message: isPt
        ? "Você já denunciou esta mensagem anteriormente."
        : "You have already reported this message.",
    };
  }
  if (code === "P0002" || msg.includes("not_found")) {
    return {
      errorCode: "not_found",
      message: isPt
        ? "Conversa ou mensagem não encontrada."
        : "Conversation or message not found.",
    };
  }
  if (code === "42501") {
    if (msg.includes("block") || msg.includes("suspend")) {
      return {
        errorCode: "blocked_or_suspended",
        message: isPt
          ? "Ação bloqueada: existe bloqueio entre os usuários ou a conta está suspensa."
          : "Action blocked: a user block or account suspension applies.",
      };
    }
    return {
      errorCode: "forbidden",
      message: isPt
        ? "Você não tem permissão para acessar ou enviar nesta conversa."
        : "You do not have permission to access or send in this conversation.",
    };
  }
  if (isMissingRpcError(err)) {
    return {
      errorCode: "migration_pending",
      message: isPt
        ? "Esta ação depende da migration local pendente de revisão."
        : "This action depends on the pending local migration awaiting review.",
    };
  }
  return {
    errorCode: "mutation_failed",
    message:
      err?.message ||
      (isPt ? "Não foi possível concluir a operação." : "Could not complete the operation."),
  };
}

/**
 * Fetches the authenticated user's DM conversations ordered by `last_message_at`.
 */
export async function fetchDmConversations(options?: {
  client?: DmSupabaseClientLike;
}): Promise<{
  status: "success" | "unauthenticated" | "error";
  items: DmConversationSummary[];
  unreadConversationCount: number;
  errorMessage?: string;
}> {
  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return { status: "unauthenticated", items: [], unreadConversationCount: 0 };
    }

    const { data: convRows, error: convErr } = await supabase
      .from("direct_conversations")
      .select("id, participant_low, participant_high, last_message_at, created_at")
      .order("last_message_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50);

    if (convErr) {
      return {
        status: "error",
        items: [],
        unreadConversationCount: 0,
        errorMessage: convErr.message || "Failed to load conversations.",
      };
    }

    const conversations = (convRows ?? []) as Array<{
      id: string;
      participant_low: string;
      participant_high: string;
      last_message_at: string;
      created_at: string;
    }>;

    if (conversations.length === 0) {
      return { status: "success", items: [], unreadConversationCount: 0 };
    }

    const convIds = conversations.map((c) => c.id);
    const otherIds = Array.from(
      new Set(
        conversations.map((c) =>
          c.participant_low === user.id ? c.participant_high : c.participant_low
        )
      )
    );

    const [membersRes, profilesRes, recentMsgsRes] = await Promise.all([
      supabase
        .from("direct_conversation_members")
        .select("conversation_id, user_id, last_read_at, is_archived, muted_until")
        .eq("user_id", user.id)
        .in("conversation_id", convIds),
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_suspended")
        .in("id", otherIds),
      supabase
        .from("direct_messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("status", "published")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const memberMap = new Map<
      string,
      { last_read_at: string | null; is_archived: boolean; muted_until: string | null }
    >();
    ((membersRes.data ?? []) as Array<{
      conversation_id: string;
      last_read_at: string | null;
      is_archived: boolean;
      muted_until: string | null;
    }>).forEach((m) => memberMap.set(m.conversation_id, m));

    const profileMap = new Map<string, DmParticipantProfile>();
    ((profilesRes.data ?? []) as Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      is_suspended: boolean;
    }>).forEach((p) =>
      profileMap.set(p.id, {
        id: p.id,
        username: p.username,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        isSuspended: p.is_suspended,
      })
    );

    const latestMsgMap = new Map<
      string,
      { sender_id: string | null; body: string; created_at: string }
    >();
    ((recentMsgsRes.data ?? []) as Array<{
      conversation_id: string;
      sender_id: string | null;
      body: string;
      created_at: string;
    }>).forEach((msg) => {
      if (!latestMsgMap.has(msg.conversation_id)) {
        latestMsgMap.set(msg.conversation_id, msg);
      }
    });

    let unreadConversationCount = 0;
    const items: DmConversationSummary[] = conversations.map((c) => {
      const otherId =
        c.participant_low === user.id ? c.participant_high : c.participant_low;
      const otherParticipant = profileMap.get(otherId) ?? {
        id: otherId,
        username: "vexor_member",
        displayName: null,
        avatarUrl: null,
      };
      const member = memberMap.get(c.id);
      const lastMsg = latestMsgMap.get(c.id) ?? null;

      const isFromOther = Boolean(lastMsg && lastMsg.sender_id && lastMsg.sender_id !== user.id);
      const hasUnread = Boolean(
        isFromOther &&
          (!member?.last_read_at ||
            new Date(lastMsg!.created_at).getTime() >
              new Date(member.last_read_at).getTime())
      );

      if (hasUnread && !member?.is_archived) {
        unreadConversationCount++;
      }

      return {
        id: c.id,
        otherParticipant,
        lastMessageAt: c.last_message_at,
        lastMessageBody: lastMsg?.body ?? null,
        lastMessageSenderId: lastMsg?.sender_id ?? null,
        lastReadAt: member?.last_read_at ?? null,
        hasUnread,
        isArchived: Boolean(member?.is_archived),
        mutedUntil: member?.muted_until ?? null,
        createdAt: c.created_at,
      };
    });

    return { status: "success", items, unreadConversationCount };
  } catch (err) {
    return {
      status: "error",
      items: [],
      unreadConversationCount: 0,
      errorMessage: err instanceof Error ? err.message : "Failed to load inbox.",
    };
  }
}

/**
 * Calls `get_or_create_dm_conversation` RPC to open or create a 1:1 DM conversation.
 */
export async function getOrCreateDmConversation(
  otherUserId: string,
  locale: SupportedLocale,
  options?: { client?: DmSupabaseClientLike }
): Promise<DmMutationResult<{ conversationId: string }>> {
  const isPt = locale === "pt-BR";
  if (!UUID_REGEX.test(otherUserId)) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: isPt ? "Usuário inválido." : "Invalid user.",
    };
  }

  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: isPt ? "Faça login para enviar mensagens." : "Sign in to send messages.",
      };
    }

    const { data, error } = await supabase.rpc("get_or_create_dm_conversation", {
      p_other_user_id: otherUserId,
    });

    if (error || !data) {
      const mapped = mapDmRpcError(error, isPt);
      return { status: "error", ...mapped };
    }

    return { status: "success", data: { conversationId: String(data) } };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

/**
 * Loads a DM conversation and paginated message history using keyset pagination `(created_at, id)`.
 * Non-participants receive `not_found` / `forbidden` via RLS.
 */
export async function fetchDmConversationDetail(
  conversationId: string,
  options?: {
    cursor?: DmMessagesCursor | null;
    pageSize?: number;
    client?: DmSupabaseClientLike;
  }
): Promise<DmConversationDetailResult> {
  const pageSize = Math.max(10, Math.min(options?.pageSize ?? 30, 60));

  if (!UUID_REGEX.test(conversationId)) {
    return {
      status: "not_found",
      conversation: null,
      messages: [],
      olderCursor: null,
      hasOlder: false,
      isBlockedByMe: false,
    };
  }

  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        status: "unauthenticated",
        conversation: null,
        messages: [],
        olderCursor: null,
        hasOlder: false,
        isBlockedByMe: false,
      };
    }

    const { data: convRow, error: convErr } = await supabase
      .from("direct_conversations")
      .select("id, participant_low, participant_high, last_message_at, created_at")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr) {
      return {
        status: convErr.code === "42501" ? "forbidden" : "error",
        conversation: null,
        messages: [],
        olderCursor: null,
        hasOlder: false,
        isBlockedByMe: false,
        errorMessage: convErr.message,
      };
    }

    if (!convRow) {
      return {
        status: "not_found",
        conversation: null,
        messages: [],
        olderCursor: null,
        hasOlder: false,
        isBlockedByMe: false,
      };
    }

    const conv = convRow as {
      id: string;
      participant_low: string;
      participant_high: string;
      last_message_at: string;
      created_at: string;
    };

    const otherId =
      conv.participant_low === user.id
        ? conv.participant_high
        : conv.participant_low;

    let msgQuery = supabase
      .from("direct_messages")
      .select("id, conversation_id, sender_id, body, status, created_at, edited_at")
      .eq("conversation_id", conversationId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);

    if (options?.cursor) {
      msgQuery = msgQuery.or(
        `created_at.lt.${options.cursor.createdAt},and(created_at.eq.${options.cursor.createdAt},id.lt.${options.cursor.id})`
      );
    }

    const [memberRes, profileRes, msgsRes, blocked] = await Promise.all([
      supabase
        .from("direct_conversation_members")
        .select("last_read_at, is_archived, muted_until")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_suspended")
        .eq("id", otherId)
        .maybeSingle(),
      msgQuery,
      isUserBlockedByMe(otherId, { client: supabase }),
    ]);

    if (msgsRes.error) {
      return {
        status: "error",
        conversation: null,
        messages: [],
        olderCursor: null,
        hasOlder: false,
        isBlockedByMe: blocked,
        errorMessage: msgsRes.error.message,
      };
    }

    const rawMsgs = (msgsRes.data ?? []) as Array<{
      id: string;
      conversation_id: string;
      sender_id: string | null;
      body: string;
      status: "published" | "hidden" | "deleted";
      created_at: string;
      edited_at: string | null;
    }>;

    const hasOlder = rawMsgs.length > pageSize;
    const sliced = hasOlder ? rawMsgs.slice(0, pageSize) : rawMsgs;
    // Reverse to chronological order for display
    const messages: DmMessageItem[] = [...sliced].reverse().map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      body: m.body,
      status: m.status,
      createdAt: m.created_at,
      editedAt: m.edited_at,
    }));

    const oldest = messages[0];
    const olderCursor: DmMessagesCursor | null =
      hasOlder && oldest
        ? { createdAt: oldest.createdAt, id: oldest.id }
        : null;

    const prof = profileRes.data as {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      is_suspended?: boolean;
    } | null;

    const member = memberRes.data as {
      last_read_at: string | null;
      is_archived: boolean;
      muted_until: string | null;
    } | null;

    const lastMsg = messages[messages.length - 1] ?? null;

    return {
      status: "success",
      conversation: {
        id: conv.id,
        otherParticipant: prof
          ? {
              id: prof.id,
              username: prof.username,
              displayName: prof.display_name,
              avatarUrl: prof.avatar_url,
              isSuspended: prof.is_suspended,
            }
          : {
              id: otherId,
              username: "vexor_member",
              displayName: null,
              avatarUrl: null,
            },
        lastMessageAt: conv.last_message_at,
        lastMessageBody: lastMsg?.body ?? null,
        lastMessageSenderId: lastMsg?.senderId ?? null,
        lastReadAt: member?.last_read_at ?? null,
        hasUnread: false,
        isArchived: Boolean(member?.is_archived),
        mutedUntil: member?.muted_until ?? null,
        createdAt: conv.created_at,
      },
      messages,
      olderCursor,
      hasOlder,
      isBlockedByMe: blocked,
    };
  } catch (err) {
    return {
      status: "error",
      conversation: null,
      messages: [],
      olderCursor: null,
      hasOlder: false,
      isBlockedByMe: false,
      errorMessage: err instanceof Error ? err.message : "Failed to load conversation.",
    };
  }
}

export async function sendDirectMessage(
  conversationId: string,
  body: string,
  locale: SupportedLocale,
  options?: { client?: DmSupabaseClientLike }
): Promise<DmMutationResult<{ messageId: string }>> {
  const isPt = locale === "pt-BR";
  const trimmed = (body ?? "").trim();
  if (trimmed.length < 1 || trimmed.length > 4000) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: isPt
        ? "A mensagem deve ter entre 1 e 4.000 caracteres."
        : "Message must be between 1 and 4,000 characters.",
    };
  }

  try {
    const supabase = getClient(options?.client);
    const { data, error } = await supabase.rpc("send_direct_message", {
      p_conversation_id: conversationId,
      p_body: trimmed,
    });

    if (error || !data) {
      const mapped = mapDmRpcError(error, isPt);
      return { status: "error", ...mapped };
    }

    return { status: "success", data: { messageId: String(data) } };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

export async function markDmConversationRead(
  conversationId: string,
  locale: SupportedLocale,
  options?: { client?: DmSupabaseClientLike }
): Promise<DmMutationResult<{ readAt: string }>> {
  const isPt = locale === "pt-BR";
  try {
    const supabase = getClient(options?.client);
    const { data, error } = await supabase.rpc("mark_dm_conversation_read", {
      p_conversation_id: conversationId,
    });

    if (error) {
      const mapped = mapDmRpcError(error, isPt);
      return { status: "error", ...mapped };
    }

    return {
      status: "success",
      data: { readAt: String(data ?? new Date().toISOString()) },
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

export async function reportDirectMessage(
  messageId: string,
  reason: DmReportReason,
  details: string | undefined,
  locale: SupportedLocale,
  options?: { client?: DmSupabaseClientLike }
): Promise<DmMutationResult<{ reportId: string }>> {
  const isPt = locale === "pt-BR";
  try {
    const supabase = getClient(options?.client);
    const { data, error } = await supabase.rpc("report_direct_message", {
      p_message_id: messageId,
      p_reason: reason,
      p_details: details?.trim() || undefined,
    });

    if (error || !data) {
      const mapped = mapDmRpcError(error, isPt);
      return { status: "error", ...mapped };
    }

    return { status: "success", data: { reportId: String(data) } };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

export async function setDmConversationArchived(
  conversationId: string,
  archived: boolean,
  locale: SupportedLocale,
  options?: { client?: DmSupabaseClientLike }
): Promise<DmMutationResult<{ archived: boolean }>> {
  const isPt = locale === "pt-BR";
  try {
    const supabase = getClient(options?.client);
    const { error } = await supabase.rpc("set_dm_conversation_archive", {
      p_conversation_id: conversationId,
      p_archived: archived,
    });

    if (error) {
      const mapped = mapDmRpcError(error, isPt);
      return { status: "error", ...mapped };
    }

    return { status: "success", data: { archived } };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

export async function setDmConversationMuted(
  conversationId: string,
  mutedUntilIso: string | null,
  locale: SupportedLocale,
  options?: { client?: DmSupabaseClientLike }
): Promise<DmMutationResult<{ mutedUntil: string | null }>> {
  const isPt = locale === "pt-BR";
  try {
    const supabase = getClient(options?.client);
    const { error } = await supabase.rpc("set_dm_conversation_mute", {
      p_conversation_id: conversationId,
      p_muted_until: mutedUntilIso,
    });

    if (error) {
      const mapped = mapDmRpcError(error, isPt);
      return { status: "error", ...mapped };
    }

    return { status: "success", data: { mutedUntil: mutedUntilIso } };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

export async function editDirectMessage(
  messageId: string,
  body: string,
  locale: SupportedLocale,
  options?: { client?: DmSupabaseClientLike }
): Promise<DmMutationResult<{ editedAt: string }>> {
  const isPt = locale === "pt-BR";
  const trimmed = (body ?? "").trim();
  if (trimmed.length < 1 || trimmed.length > 4000) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: isPt
        ? "A mensagem deve ter entre 1 e 4.000 caracteres."
        : "Message must be between 1 and 4,000 characters.",
    };
  }

  try {
    const supabase = getClient(options?.client);
    const { data, error } = await supabase.rpc("edit_direct_message", {
      p_message_id: messageId,
      p_body: trimmed,
    });

    if (error) {
      const mapped = mapDmRpcError(error, isPt);
      return { status: "error", ...mapped };
    }

    return {
      status: "success",
      data: { editedAt: String(data ?? new Date().toISOString()) },
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

/**
 * Searches active community members by username to start a new DM conversation.
 */
export async function searchMembersForDm(
  queryText: string,
  options?: { client?: DmSupabaseClientLike }
): Promise<DmParticipantProfile[]> {
  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return [];

    const sanitized = queryText.trim().replace(/[%_\\,()]/g, "").slice(0, 30);
    let query = supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_suspended")
      .neq("id", user.id)
      .eq("is_suspended", false)
      .order("username", { ascending: true })
      .limit(8);

    if (sanitized) {
      query = query.ilike("username", `%${sanitized}%`);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) return [];
    return (data as Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      is_suspended: boolean;
    }>).map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      isSuspended: p.is_suspended,
    }));
  } catch {
    return [];
  }
}
