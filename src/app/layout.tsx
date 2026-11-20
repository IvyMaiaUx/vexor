import type { Metadata } from "next";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
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
        {children}
      </body>
    </html>
  );
}
