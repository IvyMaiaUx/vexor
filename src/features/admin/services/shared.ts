import type { AuthUserProfile } from "@/features/auth/validation";
import type { PaginatedResult, PaginationParams } from "../types";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function paginateItems<T>(
  items: readonly T[],
  pagination?: PaginationParams,
  isSimulatedDemoData = false
): PaginatedResult<T> {
  const pageSize = Math.min(
    Math.max(1, pagination?.pageSize ?? DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, pagination?.page ?? 1), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
    isSimulatedDemoData,
  };
}

/**
 * UI-level guard helper mirroring database role checks.
 * Real authorization is always enforced on the server / PostgreSQL RLS & RPCs.
 */
export function hasAdminAccess(actor: AuthUserProfile | null | undefined): boolean {
  return Boolean(actor && !actor.isSuspended && actor.role === "admin");
}

export function hasModeratorAccess(
  actor: AuthUserProfile | null | undefined
): boolean {
  return Boolean(
    actor &&
      !actor.isSuspended &&
      (actor.role === "moderator" || actor.role === "admin")
  );
}
