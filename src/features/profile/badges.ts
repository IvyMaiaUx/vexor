import type { FeaturedResourceItem } from "@/config/site";
import type { AuthUserProfile } from "@/features/auth/validation";
import type { ForumPost, ForumTopic } from "@/features/forum/types";
import type { ProfileBadge, ProfileStats } from "./types";

/**
 * Computes transparent Vexor community reputation and statistics:
 * - +10 pts: Solution accepted (marked by author/moderator)
 * - +5 pts: Upvote received on topics or posts
 * - +15 pts: Catalog resource approved
 * - +3 pts: Technical topic created
 * - +1 pt: Technical reply contributed
 */
export function calculateProfileStats(
  profile: AuthUserProfile,
  allTopics: ForumTopic[],
  allPosts: ForumPost[],
  allResources: FeaturedResourceItem[]
): {
  stats: ProfileStats;
  userTopics: ForumTopic[];
  userPosts: (ForumPost & { topicTitle?: string })[];
  userContributions: FeaturedResourceItem[];
} {
  const normUser = profile.username.toLowerCase();

  // User topics
  const userTopics = allTopics.filter(
    (t) => t.authorUsername.toLowerCase() === normUser
  );

  // User posts
  const userPosts = allPosts
    .filter((p) => p.authorUsername.toLowerCase() === normUser)
    .map((p) => {
      const parentTopic = allTopics.find((t) => t.id === p.topicId);
      return {
        ...p,
        topicTitle: parentTopic ? parentTopic.title_pt : undefined,
      };
    });

  // User catalog contributions
  const userContributions = allResources.filter(
    (r) =>
      r.authorName.toLowerCase() === `@${normUser}` ||
      r.authorName.toLowerCase() === normUser ||
      r.authorName.toLowerCase().includes(normUser)
  );

  const topicsCount = userTopics.length;
  const repliesCount = userPosts.length;

  const acceptedSolutionsCount = userPosts.filter(
    (p) => p.isAcceptedSolution
  ).length;

  const topicUpvotes = userTopics.reduce((sum, t) => sum + (t.voteCount || 0), 0);
  const postUpvotes = userPosts.reduce((sum, p) => sum + (p.voteCount || 0), 0);
  const upvotesReceived = topicUpvotes + postUpvotes;

  const contributionsCount = userContributions.length;
  const approvedContributions = userContributions.filter(
    (r) => !r.status || r.status === "approved"
  ).length;

  // Base reputation score
  const reputation =
    topicsCount * 3 +
    repliesCount * 1 +
    upvotesReceived * 5 +
    acceptedSolutionsCount * 10 +
    approvedContributions * 15;

  return {
    stats: {
      reputation,
      topicsCount,
      repliesCount,
      acceptedSolutionsCount,
      contributionsCount,
      upvotesReceived,
    },
    userTopics,
    userPosts,
    userContributions,
  };
}

/**
 * Builds the official Vexor badge progression ledger
 */
export function computeProfileBadges(
  profile: AuthUserProfile,
  stats: ProfileStats
): ProfileBadge[] {
  const isSpecialist =
    Boolean(profile.specialty) ||
    profile.role === "moderator" ||
    profile.role === "admin";
  const isMod = profile.role === "moderator" || profile.role === "admin";

  return [
    {
      id: "founding-member",
      name_pt: "Membro Fundador",
      name_en: "Founding Member",
      description_pt:
        "Fez parte da fase pioneira e lançamento da plataforma Vexor.",
      description_en: "Joined during the foundational pioneer phase of Vexor.",
      icon: "🛡️",
      color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
      tier: "diamond",
      isUnlocked: true,
      unlockedAt: profile.createdAt,
    },
    {
      id: "solution-master",
      name_pt: "Especialista em Soluções",
      name_en: "Solution Specialist",
      description_pt:
        "Respondeu a uma dúvida técnica que foi aprovada como Solução Aceita pelo autor.",
      description_en:
        "Authored an accepted solution recognized by the topic author.",
      icon: "✓",
      color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      tier: "gold",
      isUnlocked: stats.acceptedSolutionsCount >= 1,
      progress: {
        current: Math.min(stats.acceptedSolutionsCount, 1),
        required: 1,
      },
    },
    {
      id: "security-researcher",
      name_pt: "Pesquisador de Segurança",
      name_en: "Security Researcher",
      description_pt:
        "Membro reconhecido por contribuições avançadas em AppSec, DFIR e análise de vulnerabilidades.",
      description_en:
        "Recognized researcher contributing to AppSec, DFIR, and vulnerability analysis.",
      icon: "⚡",
      color: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
      tier: "gold",
      isUnlocked: isSpecialist,
    },
    {
      id: "sentinel-guardian",
      name_pt: "Sentinela Vexor",
      name_en: "Vexor Sentinel",
      description_pt:
        "Papel ativo na moderação ética, acolhimento de novos membros e curadoria técnica.",
      description_en:
        "Active moderator safeguarding community ethics and technical curation.",
      icon: "⚔️",
      color: "border-purple-500/40 bg-purple-500/10 text-purple-300",
      tier: "diamond",
      isUnlocked: isMod,
    },
    {
      id: "catalog-contributor",
      name_pt: "Curador do Catálogo",
      name_en: "Catalog Curator",
      description_pt:
        "Submeteu ferramentas, repositórios ou frameworks defensivos ao catálogo.",
      description_en:
        "Contributed defensive tools, frameworks, or repos to the catalog.",
      icon: "📦",
      color: "border-amber-500/40 bg-amber-500/10 text-amber-300",
      tier: "silver",
      isUnlocked: stats.contributionsCount >= 1,
      progress: {
        current: Math.min(stats.contributionsCount, 1),
        required: 1,
      },
    },
    {
      id: "community-voice",
      name_pt: "Voz da Comunidade",
      name_en: "Community Voice",
      description_pt:
        "Iniciou pelo menos 2 debates técnicos qualificados no fórum.",
      description_en: "Started at least 2 high-quality technical debates in the forum.",
      icon: "💬",
      color: "border-blue-500/40 bg-blue-500/10 text-blue-300",
      tier: "bronze",
      isUnlocked: stats.topicsCount >= 2,
      progress: {
        current: Math.min(stats.topicsCount, 2),
        required: 2,
      },
    },
    {
      id: "reputation-elite",
      name_pt: "Elite Defensiva",
      name_en: "Defensive Elite",
      description_pt: "Alcançou mais de 40 pontos de reputação na plataforma.",
      description_en: "Attained over 40 reputation points across Vexor.",
      icon: "⭐",
      color: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
      tier: "gold",
      isUnlocked: stats.reputation >= 40,
      progress: {
        current: Math.min(stats.reputation, 40),
        required: 40,
      },
    },
  ];
}
