"use client";

import { useId, useMemo, useState } from "react";
import { getSafeExternalHref, isSafeExternalUrl } from "@/lib/security/sanitize";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-3.5 overflow-hidden rounded-xl border border-slate-800 bg-[#070b14] shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0d1322] px-3.5 py-1.5 text-xs">
        <span className="font-mono text-[11px] font-semibold uppercase text-cyan-400">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied code" : "Copy code"}
          className="rounded px-2 py-0.5 font-mono text-[10px] text-slate-400 transition-colors hover:bg-slate-800 hover:text-cyan-300"
        >
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="no-scrollbar overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function formatInlineText(text: string, baseKey: string) {
  // Regex parsing for inline elements: `code`, **bold**, *italic*, [link](url)
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let counter = 0;

  while (remaining.length > 0) {
    // 1. Inline code: `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`([\s\S]*)$/);
    // 2. Link: [label](url)
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)([\s\S]*)$/);
    // 3. Bold: **bold**
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*([\s\S]*)$/);
    // 4. Italic: *italic*
    const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*([\s\S]*)$/);
    // 5. Bare URL: https://...
    const bareUrlMatch = remaining.match(
      /^(.*?)(https?:\/\/[^\s)<>\]"']+)([\s\S]*)$/
    );

    // Pick earliest match
    interface MatchCandidate {
      type: "code" | "link" | "bold" | "italic" | "url";
      index: number;
      pre: string;
      content: string;
      extra?: string;
      post: string;
    }

    const candidates: MatchCandidate[] = [];

    if (codeMatch && typeof codeMatch.index === "number") {
      candidates.push({
        type: "code",
        index: codeMatch[1].length,
        pre: codeMatch[1],
        content: codeMatch[2],
        post: codeMatch[3],
      });
    }
    if (linkMatch && typeof linkMatch.index === "number") {
      candidates.push({
        type: "link",
        index: linkMatch[1].length,
        pre: linkMatch[1],
        content: linkMatch[2],
        extra: linkMatch[3],
        post: linkMatch[4],
      });
    }
    if (boldMatch && typeof boldMatch.index === "number") {
      candidates.push({
        type: "bold",
        index: boldMatch[1].length,
        pre: boldMatch[1],
        content: boldMatch[2],
        post: boldMatch[3],
      });
    }
    if (italicMatch && typeof italicMatch.index === "number") {
      candidates.push({
        type: "italic",
        index: italicMatch[1].length,
        pre: italicMatch[1],
        content: italicMatch[2],
        post: italicMatch[3],
      });
    }
    if (bareUrlMatch && typeof bareUrlMatch.index === "number") {
      candidates.push({
        type: "url",
        index: bareUrlMatch[1].length,
        pre: bareUrlMatch[1],
        content: bareUrlMatch[2],
        extra: bareUrlMatch[2],
        post: bareUrlMatch[3],
      });
    }

    if (candidates.length === 0) {
      tokens.push(remaining);
      break;
    }

    candidates.sort((a, b) => a.index - b.index);
    const best = candidates[0];

    if (best.pre) {
      tokens.push(best.pre);
    }

    counter++;
    const key = `${baseKey}-${counter}`;

    if (best.type === "code") {
      tokens.push(
        <code
          key={key}
          className="rounded border border-slate-800 bg-[#070b14] px-1.5 py-0.5 font-mono text-[12px] text-cyan-300"
        >
          {best.content}
        </code>
      );
    } else if (best.type === "link" && best.extra) {
      const safe = isSafeExternalUrl(best.extra)
        ? getSafeExternalHref(best.extra)
        : "#";
      tokens.push(
        <a
          key={key}
          href={safe}
          target="_blank"
          rel="noopener noreferrer ugc"
          className="text-cyan-400 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-300 hover:decoration-cyan-400"
        >
          {best.content}
        </a>
      );
    } else if (best.type === "bold") {
      tokens.push(
        <strong key={key} className="font-semibold text-slate-100">
          {best.content}
        </strong>
      );
    } else if (best.type === "url" && best.extra) {
      const safe = isSafeExternalUrl(best.extra)
        ? getSafeExternalHref(best.extra)
        : "#";
      tokens.push(
        <a
          key={key}
          href={safe}
          target="_blank"
          rel="noopener noreferrer ugc"
          className="break-all text-cyan-400 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-300 hover:decoration-cyan-400"
        >
          {best.content}
        </a>
      );
    } else if (best.type === "italic") {
      tokens.push(
        <em key={key} className="italic text-slate-200">
          {best.content}
        </em>
      );
    }

    remaining = best.post;
  }

  return tokens;
}

export function MarkdownView({ content, className = "" }: MarkdownViewProps) {
  const compId = useId();

  const blocks = useMemo(() => {
    const rawLines = content.replace(/\r\n/g, "\n").split("\n");
    const parsedBlocks: React.ReactNode[] = [];
    let i = 0;
    let blockIdx = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        i++;
        continue;
      }

      // 1. Fenced Code Block: ```lang ... ```
      if (trimmed.startsWith("```")) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < rawLines.length && !rawLines[i].trim().startsWith("```")) {
          codeLines.push(rawLines[i]);
          i++;
        }
        if (i < rawLines.length && rawLines[i].trim().startsWith("```")) {
          i++; // consume closing fence
        }
        blockIdx++;
        parsedBlocks.push(
          <CodeBlock
            key={`${compId}-code-${blockIdx}`}
            code={codeLines.join("\n")}
            language={lang}
          />
        );
        continue;
      }

      // 2. Headings (#, ##, ###)
      if (line.startsWith("# ")) {
        blockIdx++;
        parsedBlocks.push(
          <h2
            key={`${compId}-h2-${blockIdx}`}
            className="mt-6 mb-3 text-xl font-bold tracking-tight text-slate-100 first:mt-0"
          >
            {formatInlineText(line.slice(2), `${compId}-h2-${blockIdx}`)}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith("## ")) {
        blockIdx++;
        parsedBlocks.push(
          <h3
            key={`${compId}-h3-${blockIdx}`}
            className="mt-5 mb-2 text-lg font-semibold tracking-tight text-slate-100 first:mt-0"
          >
            {formatInlineText(line.slice(3), `${compId}-h3-${blockIdx}`)}
          </h3>
        );
        i++;
        continue;
      }
      if (trimmed === "---" || trimmed === "***") {
        blockIdx++;
        parsedBlocks.push(
          <hr
            key={`${compId}-hr-${blockIdx}`}
            className="my-5 border-slate-800/80"
          />
        );
        i++;
        continue;
      }

      if (
        line.startsWith("### ") &&
        line.slice(4).trim().toLowerCase() === "ficha técnica"
      ) {
        const specEntries: Array<{ label: string; value: string }> = [];
        let j = i + 1;
        while (j < rawLines.length) {
          const nextTrimmed = rawLines[j].trim();
          if (!nextTrimmed) {
            j++;
            continue;
          }
          const kvMatch = nextTrimmed.match(/^[-*]\s+\*\*([^*]+)\*\*\s*(.+)$/);
          if (kvMatch) {
            specEntries.push({
              label: kvMatch[1].replace(/:$/, "").trim(),
              value: kvMatch[2].trim(),
            });
            j++;
          } else {
            break;
          }
        }
        if (specEntries.length > 0) {
          blockIdx++;
          parsedBlocks.push(
            <div
              key={`${compId}-spec-${blockIdx}`}
              className="my-5 rounded-2xl border border-slate-800/90 bg-[#070b14]/90 p-5 shadow-inner"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Ficha Técnica
                </span>
              </div>
              <dl className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {specEntries.map((entry, entryIdx) => {
                  const isWide =
                    entry.label.toLowerCase().includes("limite") ||
                    entry.label.toLowerCase().includes("github") ||
                    entry.label.toLowerCase().includes("site");
                  return (
                    <div
                      key={`${compId}-spec-item-${blockIdx}-${entryIdx}`}
                      className={`rounded-xl border border-slate-800/70 bg-[#0d1322]/70 p-3 ${
                        isWide ? "sm:col-span-2" : ""
                      }`}
                    >
                      <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {entry.label}
                      </dt>
                      <dd className="mt-1 text-xs leading-relaxed text-slate-200">
                        {formatInlineText(
                          entry.value,
                          `${compId}-spec-val-${blockIdx}-${entryIdx}`
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          );
          i = j;
          continue;
        }
      }

      if (line.startsWith("### ")) {
        blockIdx++;
        parsedBlocks.push(
          <h4
            key={`${compId}-h4-${blockIdx}`}
            className="mt-4 mb-2 text-base font-semibold text-slate-200 first:mt-0"
          >
            {formatInlineText(line.slice(4), `${compId}-h4-${blockIdx}`)}
          </h4>
        );
        i++;
        continue;
      }

      // 3. Blockquotes: > line
      if (line.startsWith("> ")) {
        const quoteLines: string[] = [];
        while (i < rawLines.length && rawLines[i].startsWith("> ")) {
          quoteLines.push(rawLines[i].slice(2));
          i++;
        }
        blockIdx++;
        parsedBlocks.push(
          <blockquote
            key={`${compId}-quote-${blockIdx}`}
            className="my-3 border-l-2 border-cyan-500/60 bg-[#0d1322] px-4 py-2 text-xs italic leading-relaxed text-slate-300"
          >
            {formatInlineText(quoteLines.join(" "), `${compId}-quote-${blockIdx}`)}
          </blockquote>
        );
        continue;
      }

      // 4. Bullet lists: - item or * item
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const listItems: string[] = [];
        while (
          i < rawLines.length &&
          (rawLines[i].trim().startsWith("- ") ||
            rawLines[i].trim().startsWith("* "))
        ) {
          listItems.push(rawLines[i].trim().slice(2));
          i++;
        }
        blockIdx++;
        parsedBlocks.push(
          <ul
            key={`${compId}-ul-${blockIdx}`}
            className="my-3 space-y-1.5 pl-5 text-sm leading-relaxed text-slate-300 list-disc marker:text-cyan-400"
          >
            {listItems.map((item, itemIdx) => (
              <li key={`${compId}-li-${blockIdx}-${itemIdx}`}>
                {formatInlineText(item, `${compId}-li-${blockIdx}-${itemIdx}`)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 5. Ordered lists: 1. item
      if (/^\d+\.\s/.test(trimmed)) {
        const listItems: string[] = [];
        while (i < rawLines.length && /^\d+\.\s/.test(rawLines[i].trim())) {
          listItems.push(rawLines[i].trim().replace(/^\d+\.\s*/, ""));
          i++;
        }
        blockIdx++;
        parsedBlocks.push(
          <ol
            key={`${compId}-ol-${blockIdx}`}
            className="my-3 space-y-1.5 pl-5 text-sm leading-relaxed text-slate-300 list-decimal marker:text-cyan-400 font-sans"
          >
            {listItems.map((item, itemIdx) => (
              <li key={`${compId}-oli-${blockIdx}-${itemIdx}`}>
                {formatInlineText(item, `${compId}-oli-${blockIdx}-${itemIdx}`)}
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // 6. Regular paragraph
      const paraLines: string[] = [];
      while (
        i < rawLines.length &&
        rawLines[i].trim() &&
        rawLines[i].trim() !== "---" &&
        rawLines[i].trim() !== "***" &&
        !rawLines[i].trim().startsWith("```") &&
        !rawLines[i].startsWith("#") &&
        !rawLines[i].startsWith("> ") &&
        !rawLines[i].trim().startsWith("- ") &&
        !rawLines[i].trim().startsWith("* ") &&
        !/^\d+\.\s/.test(rawLines[i].trim())
      ) {
        paraLines.push(rawLines[i]);
        i++;
      }
      blockIdx++;
      parsedBlocks.push(
        <p
          key={`${compId}-p-${blockIdx}`}
          className="my-2.5 text-sm leading-relaxed text-slate-300"
        >
          {formatInlineText(paraLines.join(" "), `${compId}-p-${blockIdx}`)}
        </p>
      );
    }

    return parsedBlocks;
  }, [content, compId]);

  return <div className={`space-y-1 break-words ${className}`}>{blocks}</div>;
}
