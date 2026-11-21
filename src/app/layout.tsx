import type { Metadata } from "next";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_NAME, SITE_URL } from "@/config/seo";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vexorsec.com.br"),
  title: `${siteConfig.name} — Open Source Cybersecurity Community`,
  description:
    "Vexor: plataforma internacional e open source voltada à comunidade de cibersegurança (PT-BR / EN). Ferramentas, repositórios, laboratórios práticos e fórum técnico.",
  openGraph: {
    type: "website",
    siteName: "VEXOR",
    title: "Comunidade de Cibersegurança",
    description: "Conhecimento, ferramentas e colaboração",
    url: "https://vexorsec.com.br",
    locale: "pt_BR",
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
    title: "Comunidade de Cibersegurança",
    description: "Conhecimento, ferramentas e colaboração",
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
