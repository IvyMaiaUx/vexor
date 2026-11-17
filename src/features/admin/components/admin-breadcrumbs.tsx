"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const { dict } = useI18n();

  // Se estiver fora de /admin
  if (!pathname?.startsWith("/admin")) return null;

  const segments = pathname.split("/").filter(Boolean); // ['admin', 'catalog', etc.]

  const getBreadcrumbLabel = (seg: string): string => {
    switch (seg) {
      case "admin":
        return dict.adminPanel.breadcrumbs.admin;
      case "catalog":
        return dict.adminPanel.breadcrumbs.catalog;
      case "forum":
        return dict.adminPanel.breadcrumbs.forum;
      case "research":
        return dict.adminPanel.breadcrumbs.research;
      case "reports":
        return dict.adminPanel.breadcrumbs.reports;
      case "users":
        return dict.adminPanel.breadcrumbs.users;
      case "audit":
        return dict.adminPanel.breadcrumbs.audit;
      default:
        return seg.charAt(0).toUpperCase() + seg.slice(1);
    }
  };

  return (
    <nav
      aria-label="Breadcrumb de Administração"
      className="flex items-center gap-2 overflow-x-auto text-xs text-slate-400 no-scrollbar"
    >
      <Link
        href="/"
        className="shrink-0 transition-colors hover:text-cyan-300"
        title="Voltar ao início do Vexor"
      >
        Vexor
      </Link>

      <span className="shrink-0 text-slate-600">/</span>

      <Link
        href="/admin"
        className={`shrink-0 transition-colors hover:text-cyan-300 ${
          segments.length === 1 ? "font-semibold text-cyan-400" : ""
        }`}
      >
        {dict.adminPanel.breadcrumbs.admin}
      </Link>

      {segments.slice(1).map((seg, idx) => {
        const isLast = idx === segments.length - 2;
        const href = "/" + segments.slice(0, idx + 2).join("/");
        const label = getBreadcrumbLabel(seg);

        return (
          <React.Fragment key={href}>
            <span className="shrink-0 text-slate-600">/</span>
            {isLast ? (
              <span className="shrink-0 font-medium text-slate-200" aria-current="page">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="shrink-0 transition-colors hover:text-cyan-300"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
