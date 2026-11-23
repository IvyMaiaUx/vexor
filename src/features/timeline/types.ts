import type {
  ResourceCreditCardRequirement,
  ResourcePricingModel,
} from "@/config/site";
import type { Database } from "@/types/database.types";

export type TopicKind = Database["public"]["Enums"]["topic_kind"];

export type TimelineSortMode = "newest" | "trending" | "top_voted";

export interface TimelineCursor {
  createdAt: string;
  id: string;
}

export interface TimelineLinkedResource {
  id: string;
  slug: string;
  name: string;
  type: string;
  url: string;
  pricingModel?: ResourcePricingModel | null;
  requiresCreditCard?: ResourceCreditCardRequirement | null;
}

export interface TimelinePostItem {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryNamePt: string;
  categoryNameEn: string;
  authorId: string | null;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  authorRole?: string | null;
  title: string;
  body: string;
  kind: TopicKind;
  sharedUrl: string | null;
  resourceId: string | null;
  linkedResource: TimelineLinkedResource | null;
  tags: string[];
  voteCount: number;
  userHasVoted: boolean;
  replyCount: number;
  isPinned: boolean;
  isLocked: boolean;
  acceptedPostId: string | null;
  lastActivityAt: string;
  createdAt: string;
  editedAt?: string | null;
}

export interface TimelineQueryParams {
  kind?: TopicKind | "all";
  categorySlug?: string;
  authorIds?: string[];
  sortBy?: TimelineSortMode;
  cursor?: TimelineCursor | null;
  offset?: number;
  pageSize?: number;
}

export interface TimelineQueryResult {
  status: "success" | "unauthenticated" | "error";
  items: TimelinePostItem[];
  nextCursor: TimelineCursor | null;
  hasMore: boolean;
  errorMessage?: string;
}

export interface TimelineCreatePayload {
  kind: TopicKind;
  categoryId: string;
  title: string;
  body: string;
  tagsInput?: string;
  sharedUrl?: string;
  resourceId?: string | null;
}

export interface TimelineUpdatePayload {
  categoryId: string;
  title: string;
  body: string;
  sharedUrl?: string;
}

export type TimelineMutationResult<T = TimelinePostItem> =
  | {
      status: "success";
      data: T;
    }
  | {
      status: "error";
      errorCode:
        | "unauthenticated"
        | "suspended"
        | "rls_denied"
        | "validation_error"
        | "connection_error"
        | "mutation_failed";
      message: string;
    };
