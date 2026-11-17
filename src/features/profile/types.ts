import type { AuthUserProfile } from "@/features/auth/validation";
import type { FeaturedResourceItem } from "@/config/site";
import type { ForumPost, ForumTopic } from "@/features/forum/types";

export type ProfileTab =
  | "overview"
  | "topics"
  | "replies"
  | "contributions"
  | "badges"
  | "settings";

export interface ProfileBadge {
  id: string;
  name_pt: string;
  name_en: string;
  description_pt: string;
  description_en: string;
  icon: string;
  color: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: {
    current: number;
    required: number;
  };
}

export interface ProfileStats {
  reputation: number;
  topicsCount: number;
  repliesCount: number;
  acceptedSolutionsCount: number;
  contributionsCount: number;
  upvotesReceived: number;
}

export interface ProfileViewData {
  profile: AuthUserProfile;
  isCurrentUser: boolean;
  stats: ProfileStats;
  badges: ProfileBadge[];
  topics: ForumTopic[];
  replies: (ForumPost & { topicTitle?: string })[];
  contributions: FeaturedResourceItem[];
}
