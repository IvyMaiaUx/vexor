"use client";

import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ResearchBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function ResearchBreadcrumbs({ items }: ResearchBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-2 font-mono text-xs text-slate-400"
    >
      <Link
        href="/"
        className="transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400"
      >
        Início
      </Link>
      <span aria-hidden="true" className="text-slate-600">
        /
      </span>
      <Link
        href="/cybercrime-research"
        className="transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400"
      >
        Cybercrime Research
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={item.label} className="flex items-center gap-2">
            <span aria-hidden="true" className="text-slate-600">
              /
            </span>
            {isLast || !item.href ? (
              <span aria-current={isLast ? "page" : undefined} className="text-cyan-300 font-semibold truncate max-w-[220px] sm:max-w-none">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400 truncate max-w-[220px] sm:max-w-none"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
