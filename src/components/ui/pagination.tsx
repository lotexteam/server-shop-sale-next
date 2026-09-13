"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Пагинация каталога: настоящие <a href> (react-router Link) вместо кнопок —
 * страницы 2+ существуют в URL (?page=N) и доступны JS-краулерам и шарингу.
 * Серверный /seo/document на такие адреса отвечает noindex,follow + чистый
 * каноникал категории (SEO-PLAN §2), поэтому ссылки можно индексно-безопасно
 * отдавать и в бот-HTML.
 */
export function Pagination({
  page,
  total,
  href,
  className,
}: {
  page: number;
  total: number;
  href: (p: number) => string;
  className?: string;
}) {
  const pages = Array.from({ length: total }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === total || Math.abs(p - page) <= 1,
  );
  const items: (number | "…")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - (pages[i - 1] as number) > 1) items.push("…");
    items.push(p);
  });

  const btnCls =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-input bg-card px-2.5 text-body-sm font-medium transition-colors hover:bg-secondary";

  return (
    <nav className={cn("flex items-center gap-1.5", className)} aria-label="Пагинация">
      {page === 1 ? (
        <span className={cn(btnCls, "pointer-events-none opacity-50")} aria-hidden>
          <ChevronLeft />
        </span>
      ) : (
        <Link  href={href(page - 1)} aria-label="Назад" className={btnCls}>
          <ChevronLeft />
        </Link>
      )}
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`e${i}`} className="px-1.5 text-muted-foreground">…</span>
        ) : it === page ? (
          <span
            key={it}
            aria-current="page"
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-primary px-2.5 text-body-sm font-medium text-primary-foreground shadow-sm"
          >
            {it}
          </span>
        ) : (
          <Link key={it}  href={href(it)} className={btnCls}>
            {it}
          </Link>
        ),
      )}
      {page === total ? (
        <span className={cn(btnCls, "pointer-events-none opacity-50")} aria-hidden>
          <ChevronRight />
        </span>
      ) : (
        <Link  href={href(page + 1)} aria-label="Вперёд" className={btnCls}>
          <ChevronRight />
        </Link>
      )}
    </nav>
  );
}
