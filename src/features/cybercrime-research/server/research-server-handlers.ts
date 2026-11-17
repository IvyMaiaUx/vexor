import {
  requireServerAuthorization,
  type ServerAuthClientLike,
} from "@/lib/supabase/auth";
import type {
  ResearchPagination,
  ResearchStatus,
  ResearchSubmissionDetail,
  ResearchSubmissionSummary,
} from "../types";
import {
  containsUnsafeHtmlOrScript,
  isValidUuid,
  parseResearchListQuery,
  validateResearchCreateInput,
  validateResearchUpdateInput,
} from "../validation";
import {
  createSupabaseResearchRepository,
  ResearchRepositoryError,
  type ResearchCategoryOption,
  type ResearchRecipientView,
  type ResearchRepository,
  type ResearchSupabaseClient,
} from "./research-repository";

export type { ResearchSupabaseClient };

export interface ResearchHandlerResponse<T> {
  status: number;
  body: T | { error: string; code: string };
}

async function authorizeResearchRole(
  supabase: ResearchSupabaseClient,
  requiredRole: "active_member" | "moderator"
): Promise<
  | { ok: true; actorId: string; isModerator: boolean }
  | { ok: false; response: ResearchHandlerResponse<never> }
> {
  const { resolution, check } = await requireServerAuthorization(
    requiredRole,
    supabase as unknown as ServerAuthClientLike
  );

  if (!check.allowed || resolution.status !== "authenticated") {
    return {
      ok: false,
      response: {
        status: check.httpStatus,
        body: {
          error:
            check.httpStatus === 401
              ? "Authentication required."
              : requiredRole === "moderator"
                ? "Forbidden: moderator or admin role required."
                : "Forbidden: active member account required.",
          code: check.reason,
        },
      },
    };
  }

  return {
    ok: true,
    actorId: resolution.user.id,
    isModerator: check.authorization.isModerator,
  };
}

function handleRepositoryError(
  err: unknown,
  fallbackMessage: string,
  fallbackCode: string
): ResearchHandlerResponse<never> {
  if (err instanceof ResearchRepositoryError) {
    return {
      status: err.httpStatus,
      body: {
        error: err.message,
        code: err.code,
      },
    };
  }
  return {
    status: 500,
    body: {
      error: fallbackMessage,
      code: fallbackCode,
    },
  };
}

export async function handleListResearch(
  supabase: ResearchSupabaseClient,
  searchParams: URLSearchParams,
  repository: ResearchRepository = createSupabaseResearchRepository(supabase)
): Promise<
  ResearchHandlerResponse<{
    items: ResearchSubmissionSummary[];
    pagination: ResearchPagination;
  }>
> {
  const auth = await authorizeResearchRole(supabase, "active_member");
  if (!auth.ok) return auth.response;

  const { filters, page, pageSize } = parseResearchListQuery(searchParams);

  try {
    const result = await repository.list({
      actorId: auth.actorId,
      filters,
      page,
      pageSize,
    });

    return {
      status: 200,
      body: result,
    };
  } catch (err) {
    return handleRepositoryError(
      err,
      "Unable to list research submissions.",
      "research_list_failed"
    );
  }
}

export async function handleGetResearchById(
  supabase: ResearchSupabaseClient,
  id: string,
  repository: ResearchRepository = createSupabaseResearchRepository(supabase)
): Promise<
  ResearchHandlerResponse<{
    item: ResearchSubmissionDetail;
    recipients: ResearchRecipientView[];
  }>
> {
  const auth = await authorizeResearchRole(supabase, "active_member");
  if (!auth.ok) return auth.response;

  if (!isValidUuid(id)) {
    return {
      status: 400,
      body: { error: "Invalid research ID format.", code: "invalid_id" },
    };
  }

  try {
    const result = await repository.getById(id, auth.actorId);

    // Uniform 404 for nonexistent or unauthorized/restricted records (anti-enumeration)
    if (!result) {
      return {
        status: 404,
        body: { error: "Research submission not found.", code: "not_found" },
      };
    }

    return {
      status: 200,
      body: result,
    };
  } catch (err) {
    return handleRepositoryError(
      err,
      "Unable to load research submission.",
      "research_detail_failed"
    );
  }
}

export async function handleCreateResearch(
  supabase: ResearchSupabaseClient,
  rawBody: unknown,
  repository: ResearchRepository = createSupabaseResearchRepository(supabase)
): Promise<
  ResearchHandlerResponse<{
    id: string;
    slug: string;
    status: ResearchStatus;
    createdAt: string;
  }>
> {
  const auth = await authorizeResearchRole(supabase, "active_member");
  if (!auth.ok) return auth.response;

  const validated = validateResearchCreateInput(rawBody);
  if (!validated.ok) {
    return {
      status: 400,
      body: { error: validated.error, code: validated.code },
    };
  }

  try {
    const created = await repository.create(validated.value);
    return {
      status: 201,
      body: created,
    };
  } catch (err) {
    return handleRepositoryError(
      err,
      "Unable to submit research.",
      "research_create_failed"
    );
  }
}

export async function handleUpdateResearch(
  supabase: ResearchSupabaseClient,
  id: string,
  rawBody: unknown,
  repository: ResearchRepository = createSupabaseResearchRepository(supabase)
): Promise<ResearchHandlerResponse<{ success: true }>> {
  const auth = await authorizeResearchRole(supabase, "active_member");
  if (!auth.ok) return auth.response;

  if (!isValidUuid(id)) {
    return {
      status: 400,
      body: { error: "Invalid research ID format.", code: "invalid_id" },
    };
  }

  const validated = validateResearchUpdateInput(rawBody);
  if (!validated.ok) {
    return {
      status: 400,
      body: { error: validated.error, code: validated.code },
    };
  }

  try {
    await repository.updatePending(id, validated.value);
    return {
      status: 200,
      body: { success: true },
    };
  } catch (err) {
    return handleRepositoryError(
      err,
      "Unable to update pending research submission.",
      "research_update_failed"
    );
  }
}

export async function handleResubmitResearch(
  supabase: ResearchSupabaseClient,
  id: string,
  rawBody: unknown,
  repository: ResearchRepository = createSupabaseResearchRepository(supabase)
): Promise<ResearchHandlerResponse<{ success: true }>> {
  const auth = await authorizeResearchRole(supabase, "active_member");
  if (!auth.ok) return auth.response;

  if (!isValidUuid(id)) {
    return {
      status: 400,
      body: { error: "Invalid research ID format.", code: "invalid_id" },
    };
  }

  const validated = validateResearchCreateInput(rawBody);
  if (!validated.ok) {
    return {
      status: 400,
      body: { error: validated.error, code: validated.code },
    };
  }

  try {
    await repository.resubmit(id, validated.value);
    return {
      status: 200,
      body: { success: true },
    };
  } catch (err) {
    return handleRepositoryError(
      err,
      "Unable to resubmit research.",
      "research_resubmit_failed"
    );
  }
}

export async function handleGrantResearchRecipient(
  supabase: ResearchSupabaseClient,
  researchId: string,
  rawBody: unknown,
  repository: ResearchRepository = createSupabaseResearchRepository(supabase)
): Promise<ResearchHandlerResponse<{ success: true }>> {
  const auth = await authorizeResearchRole(supabase, "moderator");
  if (!auth.ok) return auth.response;

  if (!isValidUuid(researchId)) {
    return {
      status: 400,
      body: { error: "Invalid research ID format.", code: "invalid_id" },
    };
  }

  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return {
      status: 400,
      body: { error: "Invalid request payload.", code: "invalid_payload" },
    };
  }

  const body = rawBody as Record<string, unknown>;
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!isValidUuid(userId)) {
    return {
      status: 400,
      body: { error: "Valid recipient userId is required.", code: "invalid_user_id" },
    };
  }

  if (userId === auth.actorId) {
    return {
      status: 403,
      body: {
        error: "Forbidden: cannot grant recipient access to yourself.",
        code: "self_grant_forbidden",
      },
    };
  }

  let justification: string | null = null;
  if (body.justification !== undefined && body.justification !== null) {
    if (typeof body.justification !== "string") {
      return {
        status: 400,
        body: { error: "Justification must be a string.", code: "invalid_justification" },
      };
    }
    const trimmed = body.justification.trim();
    if (trimmed.length > 0) {
      if (trimmed.length < 5 || trimmed.length > 500) {
        return {
          status: 400,
          body: {
            error: "Justification must be between 5 and 500 characters.",
            code: "invalid_justification",
          },
        };
      }
      if (containsUnsafeHtmlOrScript(trimmed)) {
        return {
          status: 400,
          body: { error: "Unsafe HTML content is not allowed.", code: "unsafe_content" },
        };
      }
      justification = trimmed;
    }
  }

  try {
    await repository.grantRecipient(researchId, userId, justification);
    return {
      status: 200,
      body: { success: true },
    };
  } catch (err) {
    return handleRepositoryError(
      err,
      "Unable to grant recipient access.",
      "research_recipient_grant_failed"
    );
  }
}

export async function handleRevokeResearchRecipient(
  supabase: ResearchSupabaseClient,
  researchId: string,
  userId: string,
  repository: ResearchRepository = createSupabaseResearchRepository(supabase)
): Promise<ResearchHandlerResponse<{ success: true }>> {
  const auth = await authorizeResearchRole(supabase, "moderator");
  if (!auth.ok) return auth.response;

  if (!isValidUuid(researchId) || !isValidUuid(userId)) {
    return {
      status: 400,
      body: { error: "Invalid researchId or userId format.", code: "invalid_id" },
    };
  }

  try {
    await repository.revokeRecipient(researchId, userId);
    return {
      status: 200,
      body: { success: true },
    };
  } catch (err) {
    return handleRepositoryError(
      err,
      "Unable to revoke recipient access.",
      "research_recipient_revoke_failed"
    );
  }
}

export async function handleListResearchCategories(
  supabase: ResearchSupabaseClient,
  repository: ResearchRepository = createSupabaseResearchRepository(supabase)
): Promise<ResearchHandlerResponse<{ items: ResearchCategoryOption[] }>> {
  const auth = await authorizeResearchRole(supabase, "active_member");
  if (!auth.ok) return auth.response;

  try {
    const items = await repository.listCategories();
    return {
      status: 200,
      body: { items },
    };
  } catch (err) {
    return handleRepositoryError(
      err,
      "Unable to load research categories.",
      "research_categories_failed"
    );
  }
}
