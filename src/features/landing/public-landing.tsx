"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { siteConfig, type SupportedLocale } from "@/config/site";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";

interface LandingPostPreview {
  id: string;
  title: string;
  excerpt: string;
  kind: string;
  created_at: string;
  vote_count: number;
  reply_count: number;
  category_slug: string;
  category_name_pt: string;
  category_name_en: string;
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_role: string | null;
  resource_slug: string | null;
  resource_name: string | null;
  resource_pricing_model: string | null;
  resource_no_card: boolean | null;
  resource_content_policy: string | null;
}

interface LandingResourcePreview {
  id: string;
  slug: string;
  name: string;
  description_pt: string | null;
  description_en: string | null;
  description: string;
  pricing_model: string | null;
  requires_credit_card: string | null;
  content_policy: string | null;
  category_id: string;
}

interface LandingCategoryPreview {
  id: string;
  slug: string;
  name_pt: string;
  name_en: string;
}

interface PublicLandingProps {
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  dict: Dictionary;
}

const FALLBACK_CATEGORIES: LandingCategoryPreview[] = [
  { id: "osint", slug: "osint", name_pt: "OSINT", name_en: "OSINT" },
  { id: "blue-team", slug: "blue-team", name_pt: "Blue Team", name_en: "Blue Team" },
  { id: "red-team", slug: "red-team", name_pt: "Red Team", name_en: "Red Team" },
  { id: "dfir", slug: "dfir", name_pt: "DFIR", name_en: "DFIR" },
  {
    id: "ai-security",
    slug: "ai-security",
    name_pt: "Segurança de IA",
    name_en: "AI Security",
  },
  {
    id: "threat-intelligence",
    slug: "threat-intelligence",
    name_pt: "Inteligência de Ameaças",
    name_en: "Threat Intelligence",
  },
];

function formatShortDate(iso: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function formatPricingLabel(model: string | null, isPt: boolean): string | null {
  switch (model) {
    case "free":
      return isPt ? "Gratuito" : "Free";
    case "freemium":
      return "Freemium";
    case "free_trial":
      return isPt ? "Teste grátis" : "Free trial";
    case "paid":
      return isPt ? "Pago" : "Paid";
    default:
      return null;
  }
}

export function PublicLanding({
  locale,
  onLocaleChange,
  dict,
}: PublicLandingProps) {
  const isPt = locale === "pt-BR";

  const [resourceCount, setResourceCount] = useState<number>(5639);
  const [categories, setCategories] =
    useState<LandingCategoryPreview[]>(FALLBACK_CATEGORIES);
  const [posts, setPosts] = useState<LandingPostPreview[]>([]);
  const [recentResources, setRecentResources] = useState<
    LandingResourcePreview[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPublicLandingData() {
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;

        const [postsRes, resourcesRes, countRes, categoriesRes] =
          await Promise.all([
            db.rpc("get_public_landing_posts", { p_limit: 4 }),
            db
              .from("resources")
              .select(
                "id, slug, name, description, description_pt, description_en, pricing_model, requires_credit_card, content_policy, category_id"
              )
              .eq("status", "approved")
              .order("published_at", { ascending: false, nullsFirst: false })
              .order("created_at", { ascending: false })
              .limit(6),
            supabase
              .from("resources")
              .select("id", { count: "exact", head: true })
              .eq("status", "approved"),
            supabase
              .from("categories")
              .select("id, slug, name_pt, name_en")
              .eq("is_active", true)
              .order("sort_order", { ascending: true }),
          ]);

        if (!active) return;

        if (!postsRes.error && Array.isArray(postsRes.data)) {
          setPosts(postsRes.data as unknown as LandingPostPreview[]);
        }

        if (!resourcesRes.error && Array.isArray(resourcesRes.data)) {
          setRecentResources(
            resourcesRes.data as unknown as LandingResourcePreview[]
          );
        }

        if (typeof countRes.count === "number" && countRes.count > 0) {
          setResourceCount(countRes.count);
        }

        if (
          !categoriesRes.error &&
          Array.isArray(categoriesRes.data) &&
          categoriesRes.data.length > 0
        ) {
          setCategories(categoriesRes.data as LandingCategoryPreview[]);
        }
      } catch {
        // Keep graceful defaults when offline or unreachable
      } finally {
        if (active) setLoaded(true);
      }
    }

    void loadPublicLandingData();

    return () => {
      active = false;
    };
  }, []);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const formattedResourceCount = new Intl.NumberFormat(
    isPt ? "pt-BR" : "en-US"
  ).format(resourceCount);

  return (
    <>
      <main className="flex-1">
        {/* 1. HERO SECTION (Public Landing) */}
        <section className="relative overflow-hidden bg-cyber-grid pb-8 pt-6 sm:pb-14 sm:pt-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300 sm:text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                <span className="truncate">{dict.hero.eyebrow}</span>
              </div>

              <h1 className="mt-4 text-3xl font-bold leading-[1.15] tracking-tight text-slate-50 sm:mt-6 sm:text-5xl">
                {dict.hero.titleStart}
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                  {dict.hero.titleHighlight}
                </span>
                {dict.hero.titleEnd}
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-400 sm:mt-5 sm:text-lg">
                {dict.hero.subtitle}
              </p>

              {/* Primary + Secondary CTAs */}
              <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:justify-center sm:gap-3">
                <Link
                  href="/register"
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 text-base font-bold text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 sm:w-auto"
                >
                  <span>
                    {isPt ? "Criar conta grátis" : "Create free account"}
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-slate-700/80 bg-[#0d1322] px-6 text-base font-medium text-slate-100 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 sm:w-auto"
                >
                  {isPt
                    ? "Já tenho conta · Entrar"
                    : "I have an account · Sign in"}
                </Link>
              </div>
            </div>

            {/* Numbers Strip */}
            <div className="mt-7 grid grid-cols-4 border-y border-slate-800/90 py-4 text-center sm:mt-10">
              <div>
                <p className="font-mono text-lg font-bold text-cyan-400 sm:text-2xl">
                  {formattedResourceCount}
                </p>
                <p className="text-[11px] text-slate-400 sm:text-xs">
                  {isPt ? "recursos" : "resources"}
                </p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-cyan-400 sm:text-2xl">
                  {categories.length}
                </p>
                <p className="text-[11px] text-slate-400 sm:text-xs">
                  {isPt ? "categorias" : "categories"}
                </p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-cyan-400 sm:text-2xl">
                  100%
                </p>
                <p className="text-[11px] text-slate-400 sm:text-xs">
                  open source
                </p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-cyan-400 sm:text-2xl">
                  2
                </p>
                <p className="text-[11px] text-slate-400 sm:text-xs">
                  {isPt ? "idiomas" : "languages"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. COMMUNITY PREVIEW SECTION (Live Posts) */}
        <section className="py-6 sm:py-10">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
                  {isPt ? "POR DENTRO DA COMUNIDADE" : "INSIDE THE COMMUNITY"}
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
                  {isPt
                    ? "Últimas publicações da rede"
                    : "Latest posts from the network"}
                </h2>
              </div>
              <Link
                href="/forum"
                className="shrink-0 text-xs font-semibold text-cyan-400 hover:text-cyan-300 sm:text-sm"
              >
                {isPt ? "Ver fórum →" : "View forum →"}
              </Link>
            </div>

            {!loaded ? (
              <div className="mt-4 space-y-3">
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="h-36 animate-pulse rounded-2xl border border-slate-800/80 bg-[#0d1322]/70"
                  />
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="mt-4 space-y-3">
                {posts.map((post) => {
                  const handle = post.author_username
                    ? `@${post.author_username}`
                    : isPt
                      ? "membro"
                      : "member";
                  const initial = (
                    post.author_display_name ||
                    post.author_username ||
                    "V"
                  )
                    .charAt(0)
                    .toUpperCase();
                  const categoryLabel = isPt
                    ? post.category_name_pt
                    : post.category_name_en;
                  const roleBadge =
                    post.author_role === "admin"
                      ? "ADMIN"
                      : post.author_role === "moderator"
                        ? "MOD"
                        : null;
                  const pricingLabel = formatPricingLabel(
                    post.resource_pricing_model,
                    isPt
                  );

                  return (
                    <article
                      key={post.id}
                      className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-4 transition-colors hover:border-slate-700 sm:p-5"
                    >
                      <div className="flex items-center gap-2.5">
                        {post.author_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.author_avatar_url}
                            alt={handle}
                            width={40}
                            height={40}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 shrink-0 rounded-full border border-slate-800 object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
                            {initial}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-mono text-sm font-semibold text-emerald-400">
                              {handle}
                            </span>
                            {roleBadge && (
                              <span className="inline-flex h-[18px] items-center rounded border border-indigo-500/40 bg-indigo-500/15 px-1.5 font-mono text-[10px] font-semibold uppercase text-indigo-300">
                                {roleBadge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {formatShortDate(post.created_at, locale)} ·{" "}
                            <span className="text-cyan-400">
                              {categoryLabel}
                            </span>
                          </p>
                        </div>
                      </div>

                      <h3 className="mt-3 text-base font-semibold text-slate-100">
                        {post.title}
                      </h3>

                      {post.excerpt && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-400">
                          {post.excerpt}
                        </p>
                      )}

                      {post.resource_slug && post.resource_name && (
                        <Link
                          href={`/catalog/${post.resource_slug}`}
                          className="mt-3 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#070b14] p-2.5 transition-colors hover:border-cyan-500/40"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
                            {post.resource_name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-100">
                              {post.resource_name}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {pricingLabel && (
                                <span className="inline-flex h-[22px] items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 font-mono text-[11px] font-semibold text-emerald-400">
                                  {pricingLabel}
                                </span>
                              )}
                              {post.resource_no_card && (
                                <span className="inline-flex h-[22px] items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 font-mono text-[11px] font-semibold text-emerald-400">
                                  {isPt ? "Sem cartão" : "No card required"}
                                </span>
                              )}
                              {post.resource_content_policy === "reduced" && (
                                <span className="inline-flex h-[22px] items-center rounded-md border border-amber-500/35 bg-amber-500/10 px-2 font-mono text-[11px] font-semibold text-amber-300">
                                  {isPt
                                    ? "Restrições reduzidas"
                                    : "Reduced restrictions"}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs text-slate-400">
                        <div className="flex items-center gap-4">
                          <span className="inline-flex items-center gap-1.5 px-1 py-1">
                            ▲ {post.vote_count}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-1 py-1">
                            💬 {post.reply_count}
                          </span>
                        </div>
                        <Link
                          href={`/login?next=${encodeURIComponent(`/forum/${post.id}`)}`}
                          className="font-semibold text-cyan-400 hover:text-cyan-300"
                        >
                          {isPt ? "Entrar para interagir →" : "Join to interact →"}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-6 text-center">
                <p className="text-sm text-slate-300">
                  {isPt
                    ? "Entre na comunidade para acompanhar discussões técnicas, alertas e achados."
                    : "Join the community to follow technical discussions, alerts, and findings."}
                </p>
                <Link
                  href="/register"
                  className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-cyan-500/15 px-4 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/25"
                >
                  {isPt ? "Criar conta grátis →" : "Create free account →"}
                </Link>
              </div>
            )}

            {/* Category Chips (direct links to Catalog) */}
            <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/catalog?category=${encodeURIComponent(cat.slug)}`}
                  className="inline-flex min-h-[40px] shrink-0 items-center rounded-full border border-slate-800 bg-[#0d1322] px-3.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 sm:text-sm"
                >
                  {isPt ? cat.name_pt : cat.name_en}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 3. RECENT CATALOG ADDITIONS */}
        {recentResources.length > 0 && (
          <section className="py-6 sm:py-10">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
                    {isPt ? "CATÁLOGO ABERTO" : "OPEN CATALOG"}
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
                    {isPt
                      ? "Recém-adicionados ao catálogo"
                      : "Recently added to the catalog"}
                  </h2>
                </div>
                <Link
                  href="/catalog"
                  className="shrink-0 text-xs font-semibold text-cyan-400 hover:text-cyan-300 sm:text-sm"
                >
                  {isPt ? "Ver todos →" : "View all →"}
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recentResources.map((res) => {
                  const cat = categoryById.get(res.category_id);
                  const catName = cat
                    ? isPt
                      ? cat.name_pt
                      : cat.name_en
                    : null;
                  const desc =
                    (isPt ? res.description_pt : res.description_en) ||
                    res.description;
                  const pricingLabel = formatPricingLabel(
                    res.pricing_model,
                    isPt
                  );

                  return (
                    <Link
                      key={res.id}
                      href={`/catalog/${res.slug}`}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4 transition-colors hover:border-cyan-500/45"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-100 transition-colors group-hover:text-cyan-300 sm:text-base">
                            {res.name}
                          </h3>
                          {catName && (
                            <span className="shrink-0 rounded-md border border-slate-700/80 bg-[#070b14] px-2 py-0.5 font-mono text-[10px] font-medium text-cyan-300">
                              {catName}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                          {desc}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {pricingLabel && (
                          <span className="inline-flex h-[20px] items-center rounded border border-emerald-500/35 bg-emerald-500/10 px-1.5 font-mono text-[10px] font-semibold text-emerald-400">
                            {pricingLabel}
                          </span>
                        )}
                        {res.requires_credit_card === "no" && (
                          <span className="inline-flex h-[20px] items-center rounded border border-slate-700 bg-slate-800/60 px-1.5 font-mono text-[10px] text-slate-300">
                            {isPt ? "Sem cartão" : "No card"}
                          </span>
                        )}
                        {res.content_policy === "reduced" && (
                          <span className="inline-flex h-[20px] items-center rounded border border-amber-500/35 bg-amber-500/10 px-1.5 font-mono text-[10px] font-semibold text-amber-300">
                            {isPt
                              ? "Restrições reduzidas"
                              : "Reduced restrictions"}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 4. HOW IT WORKS (3 Steps Side-by-Side) */}
        <section id="contribute" className="py-6 sm:py-10">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
              {dict.contributeSection.eyebrow}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
              {isPt ? "Como funciona a contribuição" : "How contribution works"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {isPt
                ? "Qualquer membro autenticado pode sugerir ferramentas e materiais."
                : "Any authenticated member can suggest tools and learning resources."}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-4">
              <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-3 text-center sm:p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400 font-mono text-sm font-bold text-cyan-400">
                  1
                </span>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">
                  {isPt ? "Envio" : "Submit"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isPt ? "Você sugere o recurso" : "Suggest a resource"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-3 text-center sm:p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-400 font-mono text-sm font-bold text-indigo-400">
                  2
                </span>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">
                  {isPt ? "Revisão" : "Review"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isPt ? "Moderadores avaliam" : "Moderators review"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-3 text-center sm:p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400 font-mono text-sm font-bold text-emerald-400">
                  3
                </span>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">
                  {isPt ? "Publicado" : "Published"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isPt ? "Entra no catálogo" : "Joins the catalog"}
                </p>
              </div>
            </div>

            {/* Ethical Use Block */}
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4 sm:p-5">
              <span className="mt-0.5 shrink-0 text-cyan-400" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                </svg>
              </span>
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {isPt
                    ? "USO ÉTICO E SEGURANÇA DEFENSIVA"
                    : "ETHICAL USE & DEFENSIVE SECURITY"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                  {dict.contributeSection.securityNote}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Compact Public Footer with Language Switcher */}
      <footer className="border-t border-slate-800/80 bg-[#050811] py-6">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Image
              src={siteConfig.logoHorizontalPath}
              alt={siteConfig.name}
              width={150}
              height={64}
              className="h-8 w-auto object-contain"
            />
            <div
              role="group"
              aria-label={dict.nav.languageLabel}
              className="flex items-center gap-1 rounded-full border border-slate-800 bg-[#0d1322] p-0.5"
            >
              <button
                type="button"
                onClick={() => onLocaleChange("pt-BR")}
                aria-pressed={locale === "pt-BR"}
                className={`min-h-[36px] rounded-full px-3 font-mono text-xs font-semibold ${
                  locale === "pt-BR"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                PT-BR
              </button>
              <button
                type="button"
                onClick={() => onLocaleChange("en")}
                aria-pressed={locale === "en"}
                className={`min-h-[36px] rounded-full px-3 font-mono text-xs font-semibold ${
                  locale === "en"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {isPt ? "PLATAFORMA" : "PLATFORM"}
              </p>
              <div className="mt-1 flex flex-col">
                <Link
                  href="/"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  {dict.nav.home}
                </Link>
                <Link
                  href="/catalog"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  {dict.nav.catalog}
                </Link>
                <Link
                  href="/forum"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  {dict.nav.forum}
                </Link>
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {isPt ? "COMUNIDADE" : "COMMUNITY"}
              </p>
              <div className="mt-1 flex flex-col">
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  {dict.nav.signIn}
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  {dict.nav.signUp}
                </Link>
                <a
                  href="https://github.com/IvyMaiaUx/vexor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center text-sm text-slate-400 hover:text-cyan-300"
                >
                  GitHub (Open Source)
                </a>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            © 2026 Vexor ·{" "}
            {isPt
              ? "Plataforma Comunitária Open Source de Cibersegurança."
              : "Open Source Cybersecurity Community Platform."}
          </p>
        </div>
      </footer>
    </>
  );
}
