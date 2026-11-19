"use client";

import Link from "next/link";
import { useState } from "react";
import type { SupportedLocale } from "@/config/site";
import { getSafeExternalHref } from "@/lib/security/sanitize";
import type { CatalogResourceItem } from "./catalog-service";
import {
  type CourseMetadata,
  type CourseToolDepth,
  pickCourseText,
} from "./course-metadata";

interface CourseDetailViewProps {
  resource: CatalogResourceItem;
  metadata: CourseMetadata;
  locale: SupportedLocale;
  categoryName: string;
}

function getBoolLabel(val: boolean | null | undefined, isPt: boolean): string {
  if (val === true) return isPt ? "Sim" : "Yes";
  if (val === false) return isPt ? "Não" : "No";
  return isPt ? "Não informado pela instituição" : "Not informed by the institution";
}

function getCardLabel(
  val: "yes" | "no" | "depends" | "not_informed",
  isPt: boolean
): string {
  switch (val) {
    case "yes":
      return isPt ? "Sim" : "Yes";
    case "no":
      return isPt ? "Não" : "No";
    case "depends":
      return isPt ? "Depende da modalidade" : "Depends on enrollment option";
    default:
      return isPt
        ? "Não informado pela instituição"
        : "Not informed by the institution";
  }
}

function getCertPricingLabel(
  val: "free" | "paid" | "conditional" | "not_informed" | undefined,
  isPt: boolean
): string {
  switch (val) {
    case "free":
      return isPt ? "Certificado gratuito" : "Free certificate";
    case "paid":
      return isPt ? "Certificado pago" : "Paid certificate";
    case "conditional":
      return isPt
        ? "Conforme condições da plataforma"
        : "Subject to platform conditions";
    default:
      return isPt
        ? "Não informado pela instituição"
        : "Not informed by the institution";
  }
}

function getDepthBadge(depth: CourseToolDepth, isPt: boolean) {
  switch (depth) {
    case "practical":
      return {
        label: isPt ? "Prática em atividades" : "Hands-on practice",
        cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      };
    case "activity":
      return {
        label: isPt ? "Uso em atividades" : "Used in labs/activities",
        cls: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
      };
    case "complementary":
      return {
        label: isPt ? "Complementar" : "Complementary",
        cls: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
      };
    case "conceptual":
    default:
      return {
        label: isPt ? "Apresentada no conteúdo" : "Covered conceptually",
        cls: "border-slate-700 bg-slate-800/70 text-slate-300",
      };
  }
}

export function CourseDetailView({
  resource,
  metadata,
  locale,
  categoryName,
}: CourseDetailViewProps) {
  const isPt = locale === "pt-BR";
  const notInformed = isPt
    ? "Não informado pela instituição"
    : "Not informed by the institution";

  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>(
    { 1: true }
  );

  const toggleModule = (order: number) => {
    setExpandedModules((prev) => ({ ...prev, [order]: !prev[order] }));
  };

  const expandAllModules = () => {
    const next: Record<number, boolean> = {};
    metadata.modules.forEach((m) => {
      next[m.order] = true;
    });
    setExpandedModules(next);
  };

  const collapseAllModules = () => {
    setExpandedModules({});
  };

  const safeOfficialHref = getSafeExternalHref(resource.url);
  const safeSourceHref = getSafeExternalHref(metadata.sourceUrl);
  const { access, certification } = metadata;

  return (
    <div className="space-y-8">
      {/* 1. Institutional & Access Status Indicators */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-slate-700 bg-[#070b14] px-2.5 py-1 font-mono text-xs font-semibold text-slate-200">
          {metadata.institution}
        </span>
        <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 font-mono text-xs text-indigo-300">
          {categoryName} · {pickCourseText(metadata.subcategory, locale)}
        </span>
        <span className="rounded-md border border-slate-700 bg-[#0d1322] px-2.5 py-1 font-mono text-xs text-slate-300">
          {pickCourseText(metadata.formationType, locale)}
        </span>
        <span className="rounded-md border border-slate-800 bg-[#0d1322] px-2.5 py-1 font-mono text-xs text-slate-400">
          {pickCourseText(metadata.modality, locale)}
        </span>

        {access.isFree && !access.isPaid && (
          <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-300">
            {isPt ? "Gratuito" : "Free"}
          </span>
        )}
        {access.isFreemium && (
          <span className="rounded-md border border-sky-500/40 bg-sky-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-sky-300">
            Freemium
          </span>
        )}
        {access.isPaid && (
          <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-amber-300">
            {isPt ? "Pago" : "Paid"}
          </span>
        )}
        {access.hasFreeTrial && (
          <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs font-medium text-cyan-300">
            {isPt ? "Teste grátis" : "Free trial"}
          </span>
        )}
        {access.requiresCreditCard === "yes" && (
          <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 font-mono text-xs font-medium text-rose-300">
            {isPt ? "Exige cartão (no teste/assinatura)" : "Card required (trial/sub)"}
          </span>
        )}
        {certification.available && (
          <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 font-mono text-xs font-medium text-violet-300">
            {getCertPricingLabel(certification.pricing, isPt)}
          </span>
        )}
      </div>

      {/* 2. Quick Summary Metrics Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {isPt ? "Carga horária divulgada" : "Official workload"}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-slate-100">
            {pickCourseText(metadata.officialTotalHours, locale)}
          </p>
          {metadata.estimatedCompletion && (
            <p className="mt-1 text-[11px] text-slate-400">
              {pickCourseText(metadata.estimatedCompletion, locale)}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {pickCourseText(metadata.modulesLabel, locale, isPt ? "Módulos / Cursos" : "Modules / Courses")}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-slate-100">
            {metadata.moduleCount ?? metadata.modules.length}{" "}
            {isPt ? "unidades" : "units"}
          </p>
          {metadata.labsCount ? (
            <p className="mt-1 text-[11px] text-cyan-300">
              {metadata.labsCount} {isPt ? "laboratórios práticos" : "hands-on labs"}
            </p>
          ) : metadata.weeklyHours ? (
            <p className="mt-1 text-[11px] text-slate-400">
              {pickCourseText(metadata.weeklyHours, locale)}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {isPt ? "Acesso e Preço" : "Access & Pricing"}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-slate-100">
            {access.isPaid
              ? isPt
                ? "Pago (com teste/prévia)"
                : "Paid (with trial/preview)"
              : access.isFreemium
                ? "Freemium"
                : isPt
                  ? "Gratuito"
                  : "Free"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {isPt ? "Cartão: " : "Card: "}
            {getCardLabel(access.requiresCreditCard, isPt)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {isPt ? "Certificação" : "Certification"}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-slate-100">
            {certification.available
              ? getCertPricingLabel(certification.pricing, isPt)
              : isPt
                ? "Sem certificado"
                : "No certificate"}
          </p>
          <p className="mt-1 truncate text-[11px] text-slate-400">
            {certification.issuer || metadata.institution}
          </p>
        </div>
      </div>

      {/* 9 (Contextual Banner): Course <-> Learning Path Relationship */}
      {(metadata.relatedLearningPath ||
        (metadata.includedCourses && metadata.includedCourses.length > 0)) && (
        <section className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
            {isPt ? "Relacionamento no Catálogo" : "Catalog Relationship"}
          </h2>

          {metadata.relatedLearningPath && (
            <div className="mt-2.5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="text-xs leading-relaxed text-slate-300">
                <p>
                  {pickCourseText(metadata.relatedLearningPath.relationLabel, locale)}
                </p>
                <p className="mt-1 font-semibold text-slate-100">
                  {metadata.relatedLearningPath.title}
                </p>
              </div>
              <Link
                href={`/catalog/${metadata.relatedLearningPath.slug}`}
                className="shrink-0 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 font-mono text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25"
              >
                {isPt ? "Ver trilha completa →" : "View full career path →"}
              </Link>
            </div>
          )}

          {metadata.includedCourses && metadata.includedCourses.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-300">
                {isPt
                  ? "Etapas vinculadas no catálogo (navegue entre curso individual e trilha):"
                  : "Linked steps in the catalog (navigate between individual course and path):"}
              </p>
              <div className="flex flex-wrap gap-2">
                {metadata.includedCourses.map((course) => (
                  <Link
                    key={course.slug}
                    href={`/catalog/${course.slug}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-[#0d1322] px-3.5 py-2 text-xs font-medium text-cyan-200 transition-colors hover:border-cyan-400 hover:bg-cyan-500/10"
                  >
                    <span>{course.title}</span>
                    {course.hours && (
                      <span className="font-mono text-[10px] text-slate-400">
                        ({course.hours})
                      </span>
                    )}
                    <span aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3 & 4. About the course & What you will learn */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6 lg:col-span-7">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
            {isPt ? "Sobre o curso" : "About this program"}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {pickCourseText(metadata.about, locale)}
          </p>

          <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] uppercase text-slate-500">
                {isPt ? "Pré-requisitos" : "Prerequisites"}
              </dt>
              <dd className="mt-1 text-slate-200">
                {pickCourseText(metadata.prerequisites, locale)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase text-slate-500">
                {isPt ? "Público / Prazo" : "Audience / Deadline"}
              </dt>
              <dd className="mt-1 text-slate-200">
                {metadata.deadline
                  ? pickCourseText(metadata.deadline, locale)
                  : pickCourseText(metadata.audience, locale)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6 lg:col-span-5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
            {isPt ? "O que você vai aprender" : "What you will learn"}
          </h2>
          <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-300">
            {metadata.whatYouWillLearn.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400" aria-hidden="true">
                  ›
                </span>
                <span>{pickCourseText(item, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Skills Developed */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
              {isPt
                ? "Habilidades que você desenvolverá"
                : "Skills you will develop"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {isPt
                ? "Competências e áreas de conhecimento abordadas (separadas de ferramentas específicas)."
                : "Competencies and knowledge areas covered (distinct from specific tools)."}
            </p>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            {metadata.skills.length} {isPt ? "habilidades" : "skills"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {metadata.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>

      {/* 6. Tools & Technologies */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
              {isPt
                ? "Ferramentas que você vai aprender"
                : "Tools & Technologies"}
            </h2>
            {metadata.toolsNote && (
              <p className="mt-1 text-xs text-slate-400">
                {pickCourseText(metadata.toolsNote, locale)}
              </p>
            )}
          </div>
        </div>

        {metadata.tools.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-800 bg-[#070b14] p-4 text-xs text-slate-400">
            {isPt
              ? "A página oficial não lista softwares comerciais específicos; o programa aborda conceitos, práticas e metodologias de proteção de dados e segurança da informação."
              : "The official page does not list specific software tools; the program focuses on concepts, practices, and methodologies."}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {metadata.tools.map((tool) => {
              const badge = getDepthBadge(tool.depth, isPt);
              return (
                <div
                  key={tool.name}
                  className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#070b14] p-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-100">
                        {tool.name}
                      </h3>
                      <span
                        className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-cyan-400">
                      {pickCourseText(tool.category, locale)}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      {pickCourseText(tool.description, locale)}
                    </p>
                  </div>
                  <div className="mt-3 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
                    <span className="text-slate-300">
                      {pickCourseText(tool.courseRelation, locale)}
                    </span>
                    {tool.url && (
                      <a
                        href={getSafeExternalHref(tool.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block font-mono text-[10px] text-cyan-400 hover:underline"
                      >
                        {isPt ? "Site oficial ↗" : "Official site ↗"}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. Syllabus / Modules (Expandable) */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
              {isPt ? "Conteúdo programático" : "Syllabus & Modules"}
            </h2>
            {metadata.hoursDiscrepancyNote && (
              <p className="mt-1 text-xs text-slate-400">
                {pickCourseText(metadata.hoursDiscrepancyNote, locale)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAllModules}
              className="rounded-lg border border-slate-700 bg-[#070b14] px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500/40"
            >
              {isPt ? "Expandir todos" : "Expand all"}
            </button>
            <button
              type="button"
              onClick={collapseAllModules}
              className="rounded-lg border border-slate-700 bg-[#070b14] px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500/40"
            >
              {isPt ? "Recolher" : "Collapse"}
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {metadata.modules.map((mod) => {
            const isOpen = Boolean(expandedModules[mod.order]);
            return (
              <div
                key={mod.order}
                className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070b14]"
              >
                <button
                  type="button"
                  onClick={() => toggleModule(mod.order)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-900/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 font-mono text-xs font-semibold text-cyan-300">
                      {mod.order}
                    </span>
                    <span className="text-sm font-medium text-slate-100">
                      {mod.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {mod.hours && (
                      <span className="rounded border border-slate-700 bg-[#0d1322] px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                        {mod.hours}
                      </span>
                    )}
                    <span className="font-mono text-xs text-slate-400">
                      {isOpen ? "−" : "+"}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-2 border-t border-slate-800/80 px-4 py-3 text-xs text-slate-300">
                    <p>
                      {mod.description
                        ? pickCourseText(mod.description, locale)
                        : notInformed}
                    </p>
                    {mod.topics && mod.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {mod.topics.map((tp) => (
                          <span
                            key={tp}
                            className="rounded border border-slate-800 bg-[#0d1322] px-2 py-0.5 text-[11px] text-slate-300"
                          >
                            {tp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. Pricing & Access Conditions + Certification */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
            {isPt
              ? "Preço e condições de acesso"
              : "Pricing & Access Conditions"}
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-[#070b14] p-2.5">
              <dt className="text-slate-500">{isPt ? "Gratuito?" : "Free?"}</dt>
              <dd className="mt-0.5 font-semibold text-slate-200">
                {getBoolLabel(access.isFree, isPt)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#070b14] p-2.5">
              <dt className="text-slate-500">{isPt ? "Pago?" : "Paid?"}</dt>
              <dd className="mt-0.5 font-semibold text-slate-200">
                {getBoolLabel(access.isPaid, isPt)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#070b14] p-2.5">
              <dt className="text-slate-500">
                {isPt ? "Teste grátis?" : "Free trial?"}
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-200">
                {getBoolLabel(access.hasFreeTrial, isPt)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#070b14] p-2.5">
              <dt className="text-slate-500">
                {isPt ? "Prévia gratuita?" : "Free preview?"}
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-200">
                {getBoolLabel(access.hasFreePreview, isPt)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#070b14] p-2.5">
              <dt className="text-slate-500">
                {isPt ? "Exige cartão de crédito?" : "Credit card required?"}
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-200">
                {getCardLabel(access.requiresCreditCard, isPt)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#070b14] p-2.5">
              <dt className="text-slate-500">
                {isPt ? "Auxílio financeiro?" : "Financial aid?"}
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-200">
                {getBoolLabel(access.hasFinancialAid, isPt)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#070b14] p-2.5">
              <dt className="text-slate-500">
                {isPt ? "Assinatura recorrente?" : "Recurring subscription?"}
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-200">
                {getBoolLabel(access.hasRecurringSubscription, isPt)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#070b14] p-2.5">
              <dt className="text-slate-500">
                {isPt ? "Preço atual" : "Current price"}
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-200">
                {pickCourseText(access.currentPrice, locale)}
              </dd>
            </div>
          </dl>
          {access.accessNotes && (
            <p className="mt-3 rounded-xl border border-slate-800/80 bg-[#070b14] p-3 text-xs leading-relaxed text-slate-300">
              {pickCourseText(access.accessNotes, locale)}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
            {isPt ? "Certificação e requisitos" : "Certification & Requirements"}
          </h2>
          <dl className="mt-4 space-y-3 text-xs">
            <div>
              <dt className="font-mono text-[10px] uppercase text-slate-500">
                {isPt ? "Tipo / Emissor" : "Type / Issuer"}
              </dt>
              <dd className="mt-0.5 text-slate-200">
                {pickCourseText(certification.type, locale)} ·{" "}
                {certification.issuer || metadata.institution}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase text-slate-500">
                {isPt ? "Condição do certificado" : "Certificate pricing"}
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-200">
                {getCertPricingLabel(certification.pricing, isPt)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase text-slate-500">
                {isPt ? "Requisitos" : "Requirements"}
              </dt>
              <dd className="mt-0.5 leading-relaxed text-slate-300">
                {pickCourseText(certification.requirements, locale)}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="font-mono text-[10px] uppercase text-slate-500">
                  LinkedIn
                </dt>
                <dd className="mt-0.5 text-slate-200">
                  {getBoolLabel(certification.shareableOnLinkedIn, isPt)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase text-slate-500">
                  {isPt ? "Validade / Prazo" : "Validity / Deadline"}
                </dt>
                <dd className="mt-0.5 text-slate-200">
                  {pickCourseText(certification.validityOrDeadline, locale)}
                </dd>
              </div>
            </div>
            {certification.examNote && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                {pickCourseText(certification.examNote, locale)}
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* 10. How to Access + Official Source & Verification */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6 sm:flex-row sm:items-center">
        <div className="space-y-1 text-xs text-slate-400">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            {isPt
              ? "Fonte das informações e última verificação"
              : "Source & Last Verification"}
          </p>
          <p>
            {isPt ? "Fonte oficial: " : "Official source: "}
            <a
              href={safeSourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-cyan-400 hover:underline"
            >
              {metadata.sourceUrl}
            </a>
          </p>
          <p className="font-mono text-[11px] text-slate-500">
            {isPt ? "Última verificação: " : "Last verified: "}
            {metadata.lastVerifiedAt}
          </p>
        </div>

        <a
          href={safeOfficialHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400"
        >
          {isPt ? "Acessar página oficial ↗" : "Open official page ↗"}
        </a>
      </section>
    </div>
  );
}
