import type { UserRole } from "@/features/auth/validation";

export interface ForumPost {
  id: string;
  topicId: string;
  authorUsername: string;
  authorRole: UserRole;
  authorDisplayName?: string;
  body: string;
  voteCount: number;
  isAcceptedSolution: boolean;
  createdAt: string;
  updatedAt?: string;
  status?: "published" | "pending" | "hidden" | "deleted";
}

export interface ForumTopic {
  id: string;
  categorySlug: string;
  authorUsername: string;
  authorRole: UserRole;
  authorDisplayName?: string;
  title_pt: string;
  title_en: string;
  body_pt: string;
  body_en: string;
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  acceptedPostId: string | null;
  voteCount: number;
  createdAt: string;
  lastActivityAt: string;
  status?: "published" | "pending" | "hidden" | "deleted";
}

export type TopicFilterTab = "all" | "top" | "unanswered" | "solved";
export type TopicSortOption = "activity" | "newest" | "votes";
