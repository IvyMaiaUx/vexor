import type { Dictionary } from "@/lib/i18n/dictionaries";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  dict: Dictionary["pagination"];
  totalCount?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  dict,
  totalCount,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const startItem = totalCount !== undefined && pageSize !== undefined
    ? Math.min((currentPage - 1) * pageSize + 1, totalCount)
    : undefined;
  const endItem = totalCount !== undefined && pageSize !== undefined
    ? Math.min(currentPage * pageSize, totalCount)
    : undefined;

  // Generate page numbers to display (compact window for mobile)
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-6 sm:flex-row">
      <div className="text-xs text-slate-400">
        {startItem !== undefined && endItem !== undefined && totalCount !== undefined
          ? dict.showing(startItem, endItem, totalCount)
          : dict.pageOf(currentPage, totalPages)}
      </div>

      <nav aria-label="Pagination Navigation" className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label={dict.previous}
          className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-slate-800 bg-[#0d1322] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-40"
        >
          ← {dict.previous}
        </button>

        {/* Mobile Page Indicator Pill (< sm) */}
        <div className="flex items-center sm:hidden">
          <span className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 font-mono text-xs font-semibold text-cyan-300">
            {currentPage} / {totalPages}
          </span>
        </div>

        {/* Tablet & Desktop Numbered Page Buttons (sm+) */}
        <div className="hidden items-center gap-1 sm:flex">
          {getPageNumbers().map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 font-mono text-xs text-slate-500"
                >
                  …
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex h-[38px] w-[38px] items-center justify-center rounded-xl font-mono text-xs font-semibold transition-colors ${
                  isActive
                    ? "border border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                    : "border border-slate-800 bg-[#0d1322] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label={dict.next}
          className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-slate-800 bg-[#0d1322] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-40"
        >
          {dict.next} →
        </button>
      </nav>
    </div>
  );
}
