"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import type { ForumCategoryItem } from "@/features/forum/forum-service";
import {
  createTimelinePost,
  searchCatalogResourcesForComposer,
} from "./timeline-service";
import type {
  TimelineLinkedResource,
  TimelinePostItem,
  TopicKind,
} from "./types";

interface TimelineComposerProps {
  locale: SupportedLocale;
  categories: ForumCategoryItem[];
  onCreated: (post: TimelinePostItem) => void;
}

const KIND_OPTIONS: Array<{
  value: TopicKind;
  labelPt: string;
  labelEn: string;
}> = [
  { value: "discussion", labelPt: "Discussão", labelEn: "Discussion" },
  { value: "question", labelPt: "Pergunta", labelEn: "Question" },
  {
    value: "tool_share",
    labelPt: "Ferramenta / Recurso",
    labelEn: "Tool / Resource",
  },
  { value: "note", labelPt: "Nota curta", labelEn: "Short note" },
];

export function TimelineComposer({
  locale,
  categories,
  onCreated,
}: TimelineComposerProps) {
  const isPt = locale === "pt-BR";
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const [kind, setKind] = useState<TopicKind>("discussion");
  const [categoryId, setCategoryId] = useState<string>("");
  const effectiveCategoryId = categoryId || categories[0]?.id || "";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [sharedUrl, setSharedUrl] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceOptions, setResourceOptions] = useState<
    TimelineLinkedResource[]
  >([]);
  const [selectedResource, setSelectedResource] =
    useState<TimelineLinkedResource | null>(null);
  const [showExtras, setShowExtras] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!showExtras) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchCatalogResourcesForComposer(resourceSearch).then((rows) => {
        if (!cancelled) setResourceOptions(rows);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resourceSearch, showExtras]);

  const insertMarkdown = (prefix: string, suffix = "") => {
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => `${prev}${prefix}${suffix}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const selected = body.slice(start, end);
    const next =
      body.slice(0, start) + prefix + selected + suffix + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + prefix.length + selected.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const result = await createTimelinePost(
        {
          kind,
          categoryId: effectiveCategoryId,
          title,
          body,
          tagsInput,
          sharedUrl,
          resourceId: selectedResource?.id ?? null,
        },
        locale,
        { categories }
      );

      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }

      onCreated(result.data);
      setTitle("");
      setBody("");
      setTagsInput("");
      setSharedUrl("");
      setSelectedResource(null);
      setResourceSearch("");
      setSuccessMessage(
        isPt
          ? "Publicação enviada para a Timeline!"
          : "Post published to the Timeline!"
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
        {/* Post Type Chips */}
        <div
          role="group"
          aria-label={isPt ? "Tipo de publicação" : "Post type"}
          className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {KIND_OPTIONS.map((opt) => {
            const active = kind === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKind(opt.value)}
                aria-pressed={active}
                className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-3.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                    : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700"
                }`}
              >
                {isPt ? opt.labelPt : opt.labelEn}
              </button>
            );
          })}
        </div>

        {/* Title */}
        {kind !== "note" && (
          <label className="block text-sm font-medium text-slate-200">
            <span>{isPt ? "Título" : "Title"}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder={
                isPt ? "Mínimo 5 caracteres" : "Minimum 5 characters"
              }
              className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
            />
          </label>
        )}

        {/* Details + Markdown Toolbar */}
        <div>
          <label
            htmlFor="timeline-composer-body"
            className="block text-sm font-medium text-slate-200"
          >
            {isPt ? "Detalhes" : "Details"}
          </label>
          <div className="my-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => insertMarkdown("**", "**")}
              aria-label={isPt ? "Negrito" : "Bold"}
              className="inline-flex h-10 w-11 items-center justify-center rounded-xl border border-slate-800 bg-[#0d1322] font-mono text-sm font-bold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("`", "`")}
              aria-label={isPt ? "Código" : "Code"}
              className="inline-flex h-10 w-11 items-center justify-center rounded-xl border border-slate-800 bg-[#0d1322] font-mono text-xs font-bold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
            >
              &lt;/&gt;
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("### ")}
              aria-label={isPt ? "Título" : "Heading"}
              className="inline-flex h-10 w-11 items-center justify-center rounded-xl border border-slate-800 bg-[#0d1322] font-mono text-sm font-bold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
            >
              #
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("- ")}
              aria-label={isPt ? "Lista" : "List"}
              className="inline-flex h-10 w-11 items-center justify-center rounded-xl border border-slate-800 bg-[#0d1322] font-mono text-base font-bold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
            >
              •
            </button>
          </div>
          <textarea
            id="timeline-composer-body"
            ref={bodyRef}
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            placeholder={
              isPt
                ? "Escreva os detalhes técnicos, contexto ou dúvida (suporta Markdown)…"
                : "Write technical details, context, or your question (Markdown supported)…"
            }
            className="block min-h-[120px] w-full rounded-xl border border-slate-800 bg-[#0d1322] p-3.5 text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
          />
        </div>

        {/* Community Chips */}
        <div>
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            {isPt ? "COMUNIDADE" : "COMMUNITY"}
          </p>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {categories.map((cat) => {
              const active = effectiveCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  aria-pressed={active}
                  className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-3.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                      : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {isPt ? cat.name_pt : cat.name_en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <label className="block text-sm font-medium text-slate-200">
          <span>Tags</span>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="osint, siem, dfir"
            className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
          />
        </label>

        {/* Attach URL / Catalog Resource Toggle */}
        <button
          type="button"
          onClick={() => setShowExtras((prev) => !prev)}
          aria-expanded={showExtras}
          className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-[#0d1322]/60 px-4 text-sm font-medium text-cyan-400 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>
            {isPt
              ? "Anexar URL ou recurso do catálogo"
              : "Attach URL or catalog resource"}
          </span>
        </button>

        {showExtras && (
          <div className="space-y-3 rounded-xl border border-slate-800 bg-[#0d1322]/80 p-3.5">
            <label className="block text-xs font-medium text-slate-300">
              <span>{isPt ? "Link externo (HTTPS)" : "External URL (HTTPS)"}</span>
              <input
                type="url"
                value={sharedUrl}
                onChange={(e) => setSharedUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1.5 block min-h-[44px] w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
              />
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                <span>
                  {isPt
                    ? "Vincular recurso do catálogo"
                    : "Link catalog resource"}
                </span>
                <input
                  type="search"
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  placeholder={
                    isPt
                      ? "Buscar ferramenta no catálogo..."
                      : "Search tool in catalog..."
                  }
                  className="mt-1.5 block min-h-[44px] w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
                />
              </label>

              {selectedResource && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                  <span className="truncate font-semibold">
                    {selectedResource.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedResource(null)}
                    className="ml-2 text-cyan-300 hover:text-rose-300"
                  >
                    {isPt ? "Remover" : "Remove"}
                  </button>
                </div>
              )}

              {resourceOptions.length > 0 && !selectedResource && (
                <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-800 bg-[#070b14] p-1">
                  {resourceOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedResource(opt);
                        setResourceSearch("");
                      }}
                      className="flex min-h-[40px] w-full items-center justify-between rounded-lg px-2.5 text-left text-xs text-slate-200 hover:bg-slate-800/80"
                    >
                      <span className="truncate font-medium">{opt.name}</span>
                      <span className="ml-2 shrink-0 font-mono text-[10px] text-slate-400">
                        {opt.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs font-medium text-rose-200">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3.5 py-2.5 text-xs font-medium text-emerald-300">
            {successMessage}
          </p>
        )}
      </div>

      {/* Fixed Bottom Publish Button */}
      <div className="shrink-0 border-t border-slate-800/90 bg-[#070b14] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 disabled:opacity-50"
        >
          {submitting
            ? isPt
              ? "Publicando..."
              : "Publishing..."
            : isPt
              ? "Publicar na Timeline"
              : "Publish to Timeline"}
        </button>
      </div>
    </form>
  );
}
