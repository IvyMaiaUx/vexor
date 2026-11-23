import type { SupportedLocale } from "@/config/site";
import { createClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FollowSupabaseClient = any;

function getClient(): FollowSupabaseClient {
  return createClient();
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export async function fetchFollowStats(
  targetUserId: string,
  currentUserId?: string | null
): Promise<FollowStats> {
  try {
    const supabase = getClient();
    const [followersRes, followingRes, relationRes] = await Promise.all([
      supabase
        .from("user_follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", targetUserId),
      supabase
        .from("user_follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", targetUserId),
      currentUserId && currentUserId !== targetUserId
        ? supabase
            .from("user_follows")
            .select("following_id")
            .eq("follower_id", currentUserId)
            .eq("following_id", targetUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      followersCount: followersRes.count ?? 0,
      followingCount: followingRes.count ?? 0,
      isFollowing: Boolean(relationRes.data),
    };
  } catch {
    return { followersCount: 0, followingCount: 0, isFollowing: false };
  }
}

export async function fetchUserTopicsCount(
  targetUserId: string
): Promise<number> {
  try {
    const supabase = getClient();
    const { count } = await supabase
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("author_id", targetUserId)
      .eq("status", "published")
      .is("deleted_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchFollowingIds(
  currentUserId: string
): Promise<string[]> {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", currentUserId)
      .limit(500);

    if (error || !Array.isArray(data)) return [];
    return (data as Array<{ following_id?: string }>)
      .map((row) => row.following_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export async function toggleFollowUser(
  targetUserId: string,
  currentlyFollowing: boolean,
  locale: SupportedLocale
): Promise<
  | { status: "success"; following: boolean }
  | { status: "error"; message: string }
> {
  const isPt = locale === "pt-BR";
  try {
    const supabase = getClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return {
        status: "error",
        message: isPt
          ? "Faça login para seguir membros."
          : "Sign in to follow members.",
      };
    }

    if (user.id === targetUserId) {
      return {
        status: "error",
        message: isPt
          ? "Você não pode seguir a própria conta."
          : "You cannot follow yourself.",
      };
    }

    if (currentlyFollowing) {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (error) {
        return {
          status: "error",
          message:
            error.message ||
            (isPt
              ? "Não foi possível deixar de seguir."
              : "Could not unfollow user."),
        };
      }
      return { status: "success", following: false };
    }

    const { error } = await supabase
      .from("user_follows")
      .insert({ following_id: targetUserId });

    if (error) {
      // Unique violation means already following
      if (error.code === "23505") {
        return { status: "success", following: true };
      }
      return {
        status: "error",
        message:
          error.code === "42501"
            ? isPt
              ? "Não foi possível seguir este usuário."
              : "Could not follow this user."
            : error.message ||
              (isPt
                ? "Não foi possível seguir este usuário."
                : "Could not follow this user."),
      };
    }

    return { status: "success", following: true };
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : isPt
            ? "Erro de conexão."
            : "Connection error.",
    };
  }
}
