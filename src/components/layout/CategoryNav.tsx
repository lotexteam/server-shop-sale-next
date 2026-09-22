"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { catalogCategoryHref } from "@/lib/nav";

export type NavChild = {
  id: string;
  label: string;
  href: string;
  count?: number;
  children?: NavChild[];
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
  count?: number;
  children?: NavChild[];
};

export function treeToNavChildren(
  nodes: Array<{ id: string; slug: string; title: string; count?: number; children?: unknown[] }> | undefined,
  /** null — все уровни; 0 — без подкатегорий; N — N уровней (настройка меню subcategories_depth) */
  maxDepth: number | null = null,
): NavChild[] {
  if (maxDepth !== null && maxDepth <= 0) return [];
  return (nodes ?? []).map((n) => ({
    id: n.id,
    label: n.title,
    href: catalogCategoryHref(n.slug),
    count: n.count,
    children: treeToNavChildren(
      n.children as Array<{ id: string; slug: string; title: string; count?: number; children?: unknown[] }> | undefined,
      maxDepth === null ? null : maxDepth - 1,
    ),
  }));
}

const itemCls =
  "flex h-[75px] items-center whitespace-nowrap text-[15px] font-medium uppercase tracking-wide text-[#062531] transition-colors hover:text-accent";

const CLOSE_MS = 200;

function isCoarsePointer() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/** «Серверы» → «Все серверы», «СХД и полки» → без изменений первой буквы. */
function allLabel(label: string): string {
  return /^.[a-zа-яё]/.test(label) ? `Все ${label[0].toLowerCase()}${label.slice(1)}` : `Все: ${label}`;
}

/* ── Выпадающая панель ────────────────────────────────── */

const PANEL_MAX_H = "max-h-[min(60vh,420px)]";

function panelWidth(kids: NavChild[], nested: boolean): number {
  if (nested) return 288;
  if (kids.length >= 17) return 608;
  if (kids.length >= 9) return 424;
  return 264;
}

/** Строка со ссылкой и (опционально) количеством товаров. */
function Row({ item, dense = false }: { item: NavChild; dense?: boolean }) {
  return (
    <li className="min-w-0">
      <Link
         href={item.href}
        role="menuitem"
        title={item.label}
        className={cn(
          "group/row flex min-w-0 items-center gap-2 px-3.5 text-[13px] leading-5 text-[#062531] transition-colors hover:bg-[#f5f8f9] hover:text-accent",
          dense ? "py-[5px]" : "py-[7px]",
        )}
      >
        <span className="min-w-0 truncate">{item.label}</span>
        {!!item.count && item.count > 0 && (
          <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[rgba(6,37,49,0.40)] transition-colors group-hover/row:text-accent/70">
            {item.count}
          </span>
        )}
      </Link>
    </li>
  );
}

/**
 * Панель под пунктом шапки: обычный поток (absolute под обёрткой),
 * поэтому не «слетает» при скролле/переходах и не перекрывает саму шапку.
 * Плоский список — 1–3 колонки по числу; у ветвей с подкатегориями
 * вложенный список раскрывается под строкой только по клику на стрелку.
 */
export function NavPanel({
  label,
  href,
  kids,
  accent = false,
  align,
  anchorRef,
}: {
  label: string;
  href: string;
  kids: NavChild[];
  /** Конфигуратор: акцентная кнопка в шапке. */
  accent?: boolean;
  /** Жёсткая сторона привязки (кнопка у края); иначе авто по месту. */
  align?: "left" | "right";
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const nested = kids.some((k) => (k.children?.length ?? 0) > 0);
  const [openBranch, setOpenBranch] = useState<string | null>(null);
  const [side, setSide] = useState<"left" | "right">(align ?? "left");
  const width = panelWidth(kids, nested);
  const cols = kids.length >= 17 ? 3 : kids.length >= 9 ? 2 : 1;

  useLayoutEffect(() => {
    if (align) {
      setSide(align);
      return;
    }
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSide(r.left + width > window.innerWidth - 16 ? "right" : "left");
  }, [align, anchorRef, width]);

  return (
    <div
      className={cn(
        "absolute top-full z-50 max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-2 duration-150",
        side === "left" ? "left-0" : "right-0",
      )}
      role="menu"
      aria-label={label || "Категории"}
    >
      <div
        className="border border-[rgba(6,37,49,0.10)] bg-white shadow-[0_18px_44px_-16px_rgba(6,37,49,0.32)]"
        style={{ width }}
      >
        <Link
           href={href}
          role="menuitem"
          className="flex items-center justify-between gap-2 border-b border-[rgba(6,37,49,0.08)] px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-accent transition-colors hover:bg-[#f5f8f9]"
        >
          {accent ? "Открыть конфигуратор" : allLabel(label)}
          <ArrowRight className="size-3.5 shrink-0" />
        </Link>
        <ul
          className={cn(
            "overflow-y-auto overscroll-contain py-1.5 scrollbar-thin",
            PANEL_MAX_H,
            !nested && cols === 2 && "grid grid-cols-2",
            !nested && cols === 3 && "grid grid-cols-3",
          )}
        >
          {kids.map((k) => {
            const branchKids = k.children ?? [];
            const has = branchKids.length > 0;
            const open = has && openBranch === k.id;
            return (
              <li key={k.id} className="min-w-0">
                <div className="group/branch relative flex items-center">
                  <Link
                     href={k.href}
                    role="menuitem"
                    title={k.label}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 px-3.5 py-[7px] text-[13px] leading-5 transition-colors hover:bg-[#f5f8f9] hover:text-accent",
                      open && "bg-[#f5f8f9] font-semibold text-accent",
                    )}
                  >
                    <span className="min-w-0 truncate">{k.label}</span>
                    {!!k.count && k.count > 0 && !has && (
                      <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[rgba(6,37,49,0.40)] transition-colors group-hover/branch:text-accent/70">
                        {k.count}
                      </span>
                    )}
                  </Link>
                  {has && (
                    <button
                      type="button"
                      className="flex shrink-0 items-center justify-center self-stretch pr-3 text-[rgba(6,37,49,0.45)] transition-colors hover:text-accent"
                      aria-label={open ? `Свернуть: ${k.label}` : `Показать подкатегории: ${k.label}`}
                      aria-expanded={open}
                      onClick={() => setOpenBranch(open ? null : k.id)}
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180 text-accent")} />
                    </button>
                  )}
                </div>
                {open && (
                  <ul className="mb-1 ml-6 space-y-px border-l border-[rgba(6,37,49,0.10)] py-px">
                    {branchKids.map((s) => (
                      <Row key={s.id} item={s} dense />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function DesktopCategoryBar({
  items,
  isItemActive,
}: {
  items: NavItem[];
  isItemActive: (href: string) => boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(items.length);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimer = useRef<number>(0);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const ghost = ghostRef.current;
    if (!bar || !ghost) return;

    const run = () => {
      const budget = bar.clientWidth;
      const nodes = [...ghost.children] as HTMLElement[];
      if (!nodes.length) {
        setFit(items.length);
        return;
      }
      const gap = 20;
      const moreW = 72;
      const total =
        nodes.reduce((s, el) => s + el.offsetWidth, 0) + gap * Math.max(0, nodes.length - 1);
      if (total <= budget) {
        setFit(nodes.length);
        return;
      }
      let used = moreW;
      let n = 0;
      for (const el of nodes) {
        const w = el.offsetWidth + gap;
        if (used + w > budget) break;
        used += w;
        n += 1;
      }
      setFit(Math.max(1, n));
    };

    run();
    const ro = new ResizeObserver(run);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [items]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    const onDown = (e: PointerEvent) => {
      if (barRef.current && e.target instanceof Node && !barRef.current.contains(e.target)) {
        setOpenId(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [openId]);

  const openNow = (id: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenId(id);
  };
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenId(null), CLOSE_MS);
  };

  const visible = items.slice(0, fit);
  const overflow = items.slice(fit);
  const moreId = "__more__";

  return (
    <div ref={barRef} className="relative ml-4 hidden min-w-0 flex-1 lg:block">
      <div
        ref={ghostRef}
        className="pointer-events-none invisible absolute left-[-9999px] top-0 flex h-[75px] flex-nowrap"
        aria-hidden
      >
        {items.map((item) => (
          <span key={item.id} className={cn(itemCls, "px-0")}>
            {item.label}
            {(item.children?.length ?? 0) > 0 && <ChevronDown className="ml-1 size-3.5" />}
          </span>
        ))}
      </div>

      <nav className="flex h-[75px] items-center gap-5">
        {visible.map((item) => (
          <BarItem
            key={item.id}
            item={item}
            active={isItemActive(item.href)}
            open={openId === item.id}
            onOpen={() => openNow(item.id)}
            onClose={scheduleClose}
            onToggle={() => setOpenId((cur) => (cur === item.id ? null : item.id))}
          />
        ))}
        {overflow.length > 0 && (
          <BarItem
            item={{
              id: moreId,
              label: "Ещё",
              href: overflow[0]?.href ?? "/catalog",
              children: overflow.map((o) => ({
                id: o.id,
                label: o.label,
                href: o.href,
                count: o.count,
                children: o.children,
              })),
            }}
            active={false}
            open={openId === moreId}
            onOpen={() => openNow(moreId)}
            onClose={scheduleClose}
            onToggle={() => setOpenId((cur) => (cur === moreId ? null : moreId))}
            asButton
          />
        )}
      </nav>
    </div>
  );
}

function BarItem({
  item,
  active,
  open,
  onOpen,
  onClose,
  onToggle,
  asButton = false,
}: {
  item: NavItem;
  active: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  asButton?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const kids = item.children ?? [];
  const hasMenu = kids.length > 0;

  const onTitleClick = (e: MouseEvent) => {
    if (!hasMenu) return;
    if (isCoarsePointer() && !open) {
      e.preventDefault();
      onToggle();
    }
  };

  const triggerCls = cn(itemCls, "px-0", (active || open) && "text-accent");

  return (
    <div
      ref={wrapRef}
      className="relative flex h-[75px] shrink-0 items-center"
      onMouseEnter={hasMenu ? onOpen : undefined}
      onMouseLeave={hasMenu ? onClose : undefined}
    >
      {asButton ? (
        <button type="button" className={triggerCls} aria-expanded={open} aria-haspopup={hasMenu} onClick={onToggle}>
          {item.label}
          {hasMenu && (
            <ChevronDown className={cn("ml-1 size-3.5 opacity-50 transition-transform", open && "rotate-180")} />
          )}
        </button>
      ) : (
        <Link
           href={item.href}
          aria-current={active ? "page" : undefined}
          aria-expanded={hasMenu ? open : undefined}
          aria-haspopup={hasMenu || undefined}
          className={triggerCls}
          onClick={onTitleClick}
        >
          {item.label}
          {hasMenu && (
            <ChevronDown className={cn("ml-1 size-3.5 opacity-50 transition-transform", open && "rotate-180")} />
          )}
        </Link>
      )}
      {hasMenu && open && (
        <NavPanel label={item.label} href={item.href} kids={kids} anchorRef={wrapRef} />
      )}
    </div>
  );
}
