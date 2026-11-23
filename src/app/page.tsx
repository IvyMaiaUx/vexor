"use client";

import { useMemo } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { PublicLanding } from "@/features/landing/public-landing";
import { TimelineFeed } from "@/features/timeline/timeline-feed";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { locale, setLocale } = useCatalogStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);

  if (user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} onLocaleChange={setLocale} dict={dict} />
        <main className="flex-1">
          <TimelineFeed locale={locale} />
        </main>
        <Footer locale={locale} dict={dict} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />
      <PublicLanding
        locale={locale}
        onLocaleChange={setLocale}
        dict={dict}
      />
    </div>
  );
}
