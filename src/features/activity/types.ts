export type ActivityCategory =
  | "catalog"
  | "forum"
  | "contributions"
  | "bookmarks"
  | "profile";

export interface UserActivityEvent {
  id: string;
  category: ActivityCategory;
  title_pt: string;
  title_en: string;
  detail_pt?: string;
  detail_en?: string;
  timestamp: string; // ISO 8601
  link?: string;
  badgeLabel?: string;
  icon: string;
  targetKey?: string; // used for throttling/deduplication (e.g. `view:resource:owasp-top-10`)
}
