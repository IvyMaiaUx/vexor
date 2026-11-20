import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

const FALLBACK_TITLE = "Comunidade de Cibersegurança";
const FALLBACK_DESCRIPTION = "Conhecimento, ferramentas e colaboração";
const DEFAULT_OG_IMAGE = "/og/forum.png";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stripMarkdownToDescription(raw: string, maxLen = 160): string {
  const plain = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[#>*\-\d.]+\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return FALLBACK_DESCRIPTION;
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const canonicalPath = `/forum/${encodeURIComponent(id)}`;
  const canonicalUrl = `https://vexorsec.com.br${canonicalPath}`;

  let title = FALLBACK_TITLE;
  let description = FALLBACK_DESCRIPTION;

  if (UUID_REGEX.test(id)) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("topics")
        .select("id, title, body, status")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle();

      if (data?.title) {
        title = data.title.trim();
        description = stripMarkdownToDescription(data.body ?? "");
      }
    } catch {
      // Fallback safely to generic VEXOR Forum Open Graph metadata
    }
  }

  return {
    title: `${title} | VEXOR`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "article",
      siteName: "VEXOR",
      title,
      description,
      url: canonicalUrl,
      locale: "pt_BR",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "VEXOR — Comunidade de Cibersegurança",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default function ForumTopicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
