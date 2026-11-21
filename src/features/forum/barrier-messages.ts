import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ForumMutationErrorCode } from "./forum-service";

export interface ForumBarrierLike {
  errorCode: ForumMutationErrorCode;
  message: string;
  retryAfterSeconds?: number;
}

/**
 * Posting barriers are enforced in Postgres
 * (`public.enforce_forum_posting_barriers`). This maps the returned error code to
 * localized copy; any other error keeps the message coming from the service.
 */
export function describeForumMutationError(
  result: ForumBarrierLike,
  dict: Dictionary
): string {
  switch (result.errorCode) {
    case "account_too_new":
      return dict.forumBarriers.accountTooNew;
    case "rate_limited":
      return dict.forumBarriers.rateLimited(result.retryAfterSeconds ?? 30);
    case "daily_limit_reached":
      return dict.forumBarriers.dailyLimitReached;
    default:
      return result.message;
  }
}
