import type { Metadata } from "next";
import type { ReactNode } from "react";

const FORUM_TITLE = "Comunidade de Cibersegurança";
const FORUM_DESCRIPTION = "Conhecimento, ferramentas e colaboração";
const FORUM_URL = "https://vexorsec.com.br/forum";
const FORUM_OG_IMAGE = "/og/forum.png";

export const metadata: Metadata = {
  title: `${FORUM_TITLE} | VEXOR`,
  description: FORUM_DESCRIPTION,
  alternates: {
    canonical: "/forum",
  },
  openGraph: {
    type: "website",
    siteName: "VEXOR",
    title: FORUM_TITLE,
    description: FORUM_DESCRIPTION,
    url: FORUM_URL,
    locale: "pt_BR",
    images: [
      {
        url: FORUM_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "VEXOR — Comunidade de Cibersegurança",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: FORUM_TITLE,
    description: FORUM_DESCRIPTION,
    images: [FORUM_OG_IMAGE],
  },
};

export default function ForumLayout({ children }: { children: ReactNode }) {
  return children;
}
