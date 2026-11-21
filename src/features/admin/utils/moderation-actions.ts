import type { ModerationAction, ModerationQueueItem } from "../types";

/**
 * Actions the backend actually supports for a given item.
 * Mirrors the RPCs used by `/api/admin/moderation`, so the UI never offers an
 * action the server would reject as unsupported.
 */
export function getModerationAvailableActions(
  item: Pick<ModerationQueueItem, "contentType" | "status">
): ModerationAction[] {
  const { contentType, status } = item;

  if (contentType === "research") {
    switch (status) {
      case "pending":
        return ["approve", "reject", "archive"];
      case "approved":
      case "rejected":
        return ["archive"];
      case "archived":
      default:
        return [];
    }
  }

  if (contentType === "resource") {
    switch (status) {
      case "pending":
        return ["approve", "reject", "archive"];
      case "approved":
        return ["reject", "archive"];
      case "rejected":
        return ["approve", "archive"];
      case "archived":
        return ["approve", "reject"];
      default:
        return [];
    }
  }

  if (contentType === "topic") {
    switch (status) {
      case "published":
        return ["hide", "delete", "pin", "unpin", "lock", "unlock"];
      case "hidden":
        return ["unhide", "delete"];
      default:
        return [];
    }
  }

  if (contentType === "post") {
    switch (status) {
      case "published":
        return ["hide", "delete"];
      case "hidden":
        return ["unhide", "delete"];
      default:
        return [];
    }
  }

  return [];
}
