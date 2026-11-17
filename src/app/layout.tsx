import type { Metadata } from "next";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: `${siteConfig.name} — Open Source Cybersecurity Community`,
  description:
    "Vexor: plataforma internacional e open source voltada à comunidade de cibersegurança (PT-BR / EN). Ferramentas, repositórios, laboratórios práticos e fórum técnico.",
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
