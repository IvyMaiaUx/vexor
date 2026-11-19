export interface DmParticipantProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isSuspended?: boolean;
}

export interface DmConversationSummary {
  id: string;
  otherParticipant: DmParticipantProfile;
  lastMessageAt: string;
  lastMessageBody: string | null;
  lastMessageSenderId: string | null;
  lastReadAt: string | null;
  hasUnread: boolean;
  isArchived: boolean;
  mutedUntil: string | null;
  createdAt: string;
}

export interface DmMessageItem {
  id: string;
  conversationId: string;
  senderId: string | null;
  body: string;
  status: "published" | "hidden" | "deleted";
  createdAt: string;
  editedAt: string | null;
}

export interface DmMessagesCursor {
  createdAt: string;
  id: string;
}

export interface DmConversationDetailResult {
  status: "success" | "unauthenticated" | "forbidden" | "not_found" | "error";
  conversation: DmConversationSummary | null;
  messages: DmMessageItem[];
  olderCursor: DmMessagesCursor | null;
  hasOlder: boolean;
  isBlockedByMe: boolean;
  errorMessage?: string;
}

export type DmMutationErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "blocked_or_suspended"
  | "rate_limited"
  | "duplicate_report"
  | "not_found"
  | "validation_error"
  | "migration_pending"
  | "connection_error"
  | "mutation_failed";

export type DmMutationResult<T = void> =
  | { status: "success"; data: T }
  | { status: "error"; errorCode: DmMutationErrorCode; message: string };
