"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
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
  { value: "tool_share", labelPt: "Ferramenta / Recurso", labelEn: "Tool / Resource" },
  { value: "note", labelPt: "Nota curta", labelEn: "Short note" },
];

export function TimelineComposer({
  locale,
  categories,
  onCreated,
}: TimelineComposerProps) {
  const isPt = locale === "pt-BR";
  const user = useAuthStore((state) => state.user);

  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState<TopicKind>("discussion");
  const [categoryId, setCategoryId] = useState<string>("");
  const effectiveCategoryId = categoryId || categories[0]?.id || "";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [sharedUrl, setSharedUrl] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceOptions, setResourceOptions] = useState<TimelineLinkedResource[]>([]);
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

  const initial = user?.username?.charAt(0)?.toUpperCase() ?? "V";

  // Mockup: the composer starts as a single prompt row and expands on tap.
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-3 text-left shadow-xl transition-colors hover:border-cyan-500/40 sm:p-3.5"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/15 font-mono text-sm font-semibold text-cyan-300"
        >
          {initial}
        </span>
        <span className="flex-1 text-sm text-slate-400">
          {isPt
            ? "Compartilhe uma discussão, pergunta ou recurso…"
            : "Share a discussion, question or resource…"}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 shrink-0 text-slate-400"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-4 shadow-xl sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
          {isPt ? "Nova Publicação" : "New Post"}
        </span>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label={isPt ? "Tipo de publicação" : "Post type"}>
          {KIND_OPTIONS.map((opt) => {
            const active = kind === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKind(opt.value)}
                aria-pressed={active}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  active
                    ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-800 bg-[#070b14] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {isPt ? opt.labelPt : opt.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3.5 space-y-3">
        {kind !== "note" && (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder={
              isPt
                ? "Título da publicação (mín. 5 caracteres)..."
                : "Post title (min. 5 characters)..."
            }
            aria-label={isPt ? "Título da publicação" : "Post title"}
            className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
          />
        )}

        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={20000}
          placeholder={
            kind === "note"
              ? isPt
                ? "Compartilhe uma nota técnica, dica rápida ou descoberta..."
                : "Share a quick technical note, tip, or finding..."
              : isPt
                ? "Escreva os detalhes técnicos, contexto ou dúvida (suporta Markdown)..."
                : "Write technical details, context, or your question (Markdown supported)..."
          }
          aria-label={isPt ? "Conteúdo da publicação" : "Post content"}
          className="w-full rounded-xl border border-slate-800 bg-[#070b14] p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
        />

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <select
            value={effectiveCategoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label={isPt ? "Categoria" : "Category"}
            className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {isPt ? cat.name_pt : cat.name_en}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder={
              isPt ? "Tags (ex: osint, siem, dfir)" : "Tags (e.g., osint, siem, dfir)"
            }
            aria-label={isPt ? "Tags" : "Tags"}
            className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowExtras((v) => !v)}
            className="rounded-lg border border-slate-800 bg-[#070b14] px-3 py-1.5 font-mono text-[11px] text-slate-400 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
          >
            {showExtras
              ? isPt
                ? "− Ocultar link / recurso"
                : "− Hide link / resource"
              : isPt
                ? "+ Anexar URL ou recurso do catálogo"
                : "+ Attach URL or catalog resource"}
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 disabled:opacity-50"
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

        {showExtras && (
          <div className="space-y-3 rounded-xl border border-slate-800/80 bg-[#070b14]/80 p-3.5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                {isPt ? "URL externa (opcional)" : "External URL (optional)"}
              </label>
              <input
                type="url"
                value={sharedUrl}
                onChange={(e) => setSharedUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-slate-800 bg-[#0d1322] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                {isPt
                  ? "Associar recurso do catálogo (opcional)"
                  : "Link a catalog resource (optional)"}
              </label>
              {selectedResource ? (
                <div className="mt-1.5 flex items-center justify-between rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                  <span className="truncate font-medium">
                    {selectedResource.name} ({selectedResource.type})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedResource(null)}
                    className="ml-2 font-mono text-[11px] text-cyan-300 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="mt-1 space-y-1.5">
                  <input
                    type="search"
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    placeholder={
                      isPt
                        ? "Buscar ferramenta ou curso no catálogo..."
                        : "Search tool or course in catalog..."
                    }
                    className="w-full rounded-lg border border-slate-800 bg-[#0d1322] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
                  />
                  {resourceOptions.length > 0 && (
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-800 bg-[#0d1322] divide-y divide-slate-800/70">
                      {resourceOptions.map((res) => (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => setSelectedResource(res)}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800/60"
                        >
                          <span className="truncate">{res.name}</span>
                          <span className="ml-2 shrink-0 font-mono text-[10px] text-cyan-400">
                            {res.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
            {successMessage}
          </p>
        )}
      </div>
    </form>
  );
}
