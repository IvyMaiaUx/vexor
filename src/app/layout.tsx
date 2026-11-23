import type { Metadata } from "next";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { JsonLd } from "@/components/seo/json-ld";
import { CATALOG_URL, SITE_NAME, SITE_URL } from "@/config/seo";
import { siteConfig } from "@/config/site";
import "./globals.css";

const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || undefined;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${siteConfig.name} — Comunidade e Catálogo Open Source de Cibersegurança`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "Vexor: plataforma internacional e open source voltada à comunidade de cibersegurança (PT-BR / EN). Catálogo com mais de 5.600 ferramentas, OSINT, Red Team, Blue Team, DFIR, IA e fórum técnico.",
  keywords: [
    "Vexor",
    "VexorSec",
    "cibersegurança",
    "cybersecurity",
    "segurança da informação",
    "OSINT",
    "Red Team",
    "Blue Team",
    "DFIR",
    "Threat Intelligence",
    "catálogo de ferramentas",
    "open source",
    "comunidade cibersegurança",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "VEXOR — Comunidade e Catálogo de Cibersegurança",
    description:
      "Conhecimento, ferramentas open source, OSINT, Red Team, Blue Team e colaboração.",
    url: SITE_URL,
    locale: "pt_BR",
    alternateLocale: ["en_US"],
    images: [
      {
        url: "/og/forum.png",
        width: 1200,
        height: 630,
        alt: "VEXOR — Comunidade de Cibersegurança",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VEXOR — Comunidade e Catálogo de Cibersegurança",
    description:
      "Conhecimento, ferramentas open source, OSINT, Red Team, Blue Team e colaboração.",
    images: ["/og/forum.png"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  alternateName: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}${siteConfig.logoIconPath}`,
  sameAs: ["https://github.com/IvyMaiaUx/vexor"],
  description:
    "Comunidade open source de cibersegurança: ferramentas, repositórios, laboratórios práticos e fórum técnico (PT-BR / EN).",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: siteConfig.name,
  url: SITE_URL,
  inLanguage: ["pt-BR", "en"],
  publisher: { "@type": "Organization", name: siteConfig.name, url: SITE_URL },
  potentialAction: {
    "@type": "SearchAction",
    target: `${CATALOG_URL}?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="dark h-full scroll-smooth antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#070b14] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        <AuthSessionSync />
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        {children}
      </body>
    </html>
  );
}
