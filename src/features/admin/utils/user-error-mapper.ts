export interface AdminUserErrorMessages {
  forbidden: string;
  selfDemote: string;
  selfSuspend: string;
  lastAdmin: string;
  reasonTooShort: string;
  alreadySuspended: string;
  alreadyActive: string;
  notFound: string;
  generic: string;
}

/**
 * Maps service-layer PostgreSQL-compatible error codes/messages into
 * localized UI feedback without masking authorization failures.
 */
export function mapAdminUserServiceError(
  error: string | undefined,
  messages: AdminUserErrorMessages
): string {
  if (!error) return messages.generic;
  const lower = error.toLowerCase();

  if (lower.includes("demote themselves")) return messages.selfDemote;
  if (lower.includes("suspend themselves")) return messages.selfSuspend;
  if (lower.includes("last active administrator")) return messages.lastAdmin;
  if (lower.includes("42501") || lower.includes("forbidden")) return messages.forbidden;
  if (lower.includes("at least 5 characters")) return messages.reasonTooShort;
  if (lower.includes("already suspended")) return messages.alreadySuspended;
  if (lower.includes("already active")) return messages.alreadyActive;
  if (lower.includes("p0002") || lower.includes("not found")) return messages.notFound;

  return messages.generic;
}
