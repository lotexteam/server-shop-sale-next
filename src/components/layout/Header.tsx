"use client";

/* Turbopack SVG import returns an object, not a URL - file in public/ */
const headerLogo = "/header_logo.svg";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, Menu, Search, User, GitCompare, Phone, X, ChevronDown } from "lucide-react";
import { NavPanel, DesktopCategoryBar, treeToNavChildren, type NavChild, type NavItem } from "./CategoryNav";
import { SearchAutocomplete } from "../ui/search-autocomplete";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { CartDrawer } from "./CartDrawer";
import { useShop } from "@/store/shop";
import { useCategories } from "@/hooks/useCategories";
import { useContacts } from "@/hooks/useContacts";
import { useMenu } from "@/hooks/useMenu";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { SALE_CONTACTS } from "@/data/info";
import { cn } from "@/lib/utils";

import {
  CONFIGURATOR_HREF,
  CONFIGURATOR_SLUG,
  catalogCategoryHref,
  categorySlugFromHref,
  findCategoryForNav,
  isConfiguratorHref,
} from "@/lib/nav";


/**
 * Шапка в концепции старого сайта sale-server: белая строка 75px без полос,
 * логотип слева, категории uppercase, у правого края — красная кнопка
 * «Конфигуратор» с шестерёнками, поиск — иконка, разворачивающаяся в строку
 * (как .search в оригинале: 45px → 335px).
 */

const FALLBACK_CATEGORIES = [
  { id: "fb-1", slug: "servery", title: "Серверы" },
  { id: "fb-2", slug: "komplektuyushchie-k-serveram", title: "Комплектующие" },
  { id: "fb-3", slug: "rabochie-stantsii", title: "Рабочие станции" },
  { id: "fb-4", slug: "skhd-i-diskovye-polki", title: "СХД и дисковые полки" },
];

function categoryChildren(
  cat?: { id?: string; slug?: string; title?: string; children?: Array<{ id: string; slug: string; title: string; count?: number; children?: unknown[] }> } | null,
  maxDepth: number | null = null,
): NavChild[] {
  return treeToNavChildren(cat?.children as Array<{ id: string; slug: string; title: string; count?: number; children?: unknown[] }> | undefined, maxDepth);
}

/** Поиск-иконка: панель разворачивается влево и плавно НАКЛАДЫВАЕТСЯ на соседей, не двигая их. */
function ExpandableSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | PointerEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative hidden md:block">
      {/* Якорь в потоке — соседей не сдвигает */}
      <button
        type="button"
        className={cn(
          "flex size-12 items-center justify-center transition-colors",
          open ? "text-accent" : "text-[#062531] hover:text-accent",
        )}
        aria-label="Поиск"
        onClick={() => setOpen((v) => !v)}
      >
        <Search className="size-5" />
      </button>
      {/* Наложение: панель абсолютная, растёт влево */}
      <div
        className={cn(
          "absolute right-0 top-0 h-[45px] rounded-[2px] bg-white transition-all duration-300",
          open
            ? "pointer-events-auto z-10 w-[335px] opacity-100 shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
            : "pointer-events-none w-[45px] opacity-0",
        )}
      >
        {open && (
          <SearchAutocomplete
            autoFocus
            value={q}
            onChange={setQ}
            onClear={() => setQ("")}
            className="mr-[45px] w-full [&_input]:h-[45px] [&_input]:rounded-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:shadow-none"
          />
        )}
        <button
          type="button"
          className="absolute right-0 top-0 flex h-full w-[45px] items-center justify-center text-[#062531] transition-colors hover:text-accent"
          aria-label="Закрыть поиск"
          onClick={() => {
            setOpen(false);
            setQ("");
          }}
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}



/** Красная кнопка «Конфигуратор»: ведёт в категорию, меню только по наведению/клику. */
function ConfiguratorButton({ href = CONFIGURATOR_HREF, links = [] }: { href?: string; links?: NavChild[] }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hasMenu = links.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="relative hidden shrink-0 lg:block"
      onMouseEnter={() => {
        if (!hasMenu) return;
        window.clearTimeout(timer.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setOpen(false), 180);
      }}
    >
      <Link
         href={href}
        className="relative flex h-[75px] w-[150px] items-center justify-center overflow-hidden bg-[#bf182f] text-center text-[15px] uppercase tracking-wide text-white transition-colors duration-300 hover:bg-[#c3202f]"
        onClick={(e) => {
          if (!hasMenu) return;
          if (window.matchMedia("(pointer: coarse)").matches && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <img
          src="/images/ico/gear.png"
          alt=""
          aria-hidden
          className="gear-spin pointer-events-none absolute left-[33%] top-[70%] size-[78px] opacity-30"
        />
        <img
          src="/images/ico/gear.png"
          alt=""
          aria-hidden
          className="gear-spin-rev pointer-events-none absolute left-[77%] top-[45%] size-[45px] opacity-30"
        />
        <span className="relative">Конфигуратор</span>
      </Link>
      {hasMenu && open && (
        <NavPanel label="Конфигуратор" href={href} kids={links} accent align="right" anchorRef={wrapRef} />
      )}
    </div>
  );
}

function branchHasSlug(item: NavItem, slug: string): boolean {
  if (!slug) return false;
  const [, query = ""] = item.href.split("?");
  if (new URLSearchParams(query).get("category") === slug) return true;
  return (item.children ?? []).some((ch) => branchHasSlug(ch as NavItem, slug));
}

function DrawerNavBranch({
  item,
  onNavigate,
  accent = false,
  depth = 0,
  activeSlug = "",
}: {
  item: NavItem;
  onNavigate: () => void;
  accent?: boolean;
  depth?: number;
  /** Активная категория каталога — ветка с ней раскрыта сразу */
  activeSlug?: string;
}) {
  const [open, setOpen] = useState(() => branchHasSlug(item, activeSlug));
  const kids = item.children ?? [];

  // 1 категория = 1 строка: фиксированная высота ряда, длинное название
  // обрезается многоточием и никогда не переносится.
  const rowCls = cn(
    "flex min-w-0 items-center px-3 transition-colors hover:text-accent",
    depth === 0 ? "h-12 text-body-sm font-medium uppercase" : "h-11 text-[13px] font-medium",
    accent && "text-accent",
  );

  return (
    <div className={cn(depth === 0 && "border-b border-border/60 last:border-0")}>
      <div className="flex items-center">
        {/* Клик по категории ведёт в неё; меню закрывается программно в onNavigate */}
        <Link  href={item.href} className={rowCls} onClick={onNavigate}>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </Link>
        {kids.length > 0 && (
          <button
            type="button"
            className="flex w-11 shrink-0 items-center justify-center self-stretch text-[#062531]"
            aria-expanded={open}
            aria-label={open ? "Свернуть" : "Показать подкатегории"}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>
      {open && kids.length > 0 && (
        <div
          className={cn(
            "mb-1 ml-3 border-l border-border pl-2",
            kids.length > 14 && "max-h-56 overflow-y-auto overscroll-contain",
          )}
        >
          <div className="divide-y divide-border/50">
            {kids.map((ch) => (
              <DrawerNavBranch
                key={ch.id}
                item={ch}
                onNavigate={onNavigate}
                depth={depth + 1}
                activeSlug={activeSlug}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { favorites, compare } = useShop();
  const { categories } = useCategories();
  const { contacts } = useContacts();
  const { items: headerMenu, subcategoriesDepth: navDepth } = useMenu("header");
  const { site } = useSiteSettings();
  const brand = site?.brand?.trim() || "";
  const logoSrc = site?.logoUrl || headerLogo;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cats = categories.length ? categories : FALLBACK_CATEGORIES;
  // Меню управляемое: ссылки навигации закрывают его программно (без DrawerClose),
  // иначе Radix успевает размонтировать контент раньше перехода.
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Телефоны из CMS-контактов (админка → Настройки → Контакты);
  // до загрузки — данные из info.ts.
  const phones = (contacts?.phones?.length ? contacts.phones : SALE_CONTACTS.phones).map((p) => ({
    label: p,
    href: `tel:${p.replace(/\D+/g, "")}`,
  }));

  // Пункт «Конфигуратор» из CMS-меню не дублируется в текстовой навигации:
  // красная кнопка всегда ведёт в категорию konfigurator.
  const configuratorItem = headerMenu.find((i) => isConfiguratorHref(i.href, i.label));
  const konfiguratorCat = findCategoryForNav(
    cats,
    configuratorItem?.categorySlug || CONFIGURATOR_SLUG,
    configuratorItem?.label || "Конфигуратор",
    configuratorItem?.categoryId,
  );
  const configuratorChildren = categoryChildren(konfiguratorCat, navDepth);

  const menuToChild = (ch: { id: string; label: string; href: string; children?: unknown[]; categorySlug?: string }): NavChild => {
    const nested = Array.isArray(ch.children)
      ? (ch.children as Array<{ id: string; label: string; href: string; children?: unknown[]; categorySlug?: string }>).map(menuToChild)
      : [];
    const slug = ch.categorySlug || categorySlugFromHref(ch.href);
    const fromCat = !nested.length && slug ? categoryChildren(findCategoryForNav(cats, slug, ch.label), navDepth) : [];
    return {
      id: ch.id,
      label: ch.label,
      href: ch.href,
      children: nested.length ? nested : fromCat.length ? fromCat : undefined,
    };
  };

  const toNavItem = (
    id: string,
    label: string,
    href: string,
    extra?: NavChild[],
    categorySlug?: string,
    categoryId?: string,
  ): NavItem => {
    const slug = categorySlug || categorySlugFromHref(href);
    const fromCat = categoryChildren(findCategoryForNav(cats, slug, label, categoryId), navDepth);
    const children = fromCat.length ? fromCat : extra ?? [];
    return { id, label, href, children: children.length ? children : undefined };
  };

  const cmsNav = headerMenu.filter((i) => i.id !== configuratorItem?.id);
  const navItems: NavItem[] = cmsNav.length
    ? cmsNav.map((i) =>
        toNavItem(
          i.id,
          i.label,
          i.href,
          (i.children ?? []).map(menuToChild),
          i.categorySlug,
          i.categoryId,
        ),
      )
    : [
        ...cats
          .filter((c) => c.slug !== CONFIGURATOR_SLUG)
          .slice(0, 6)
          .map((c) => toNavItem(c.id, c.title, catalogCategoryHref(c.slug), categoryChildren(c))),
        { id: "fb-services", label: "Услуги", href: "/services" },
        { id: "fb-contacts", label: "Контакты", href: "/contacts" },
      ];

  // Активность пункта: путь + параметры из href (категории живут на одном
  // pathname /catalog — без сравнения category=slug активны все сразу).
  const isItemActive = (href: string) => {
    const [path, query = ""] = href.split("?");
    if (pathname !== path) return false;
    const params = new URLSearchParams(query);
    for (const [key, value] of params) {
      if ((searchParams.get(key) || "") !== value) return false;
    }
    return true;
  };

  // ── Мобильное меню: без дублей «меню vs категории» ──────────────────────
  // Категории показываем один раз — деревом с раскрытием ветвей. Пункты
  // CMS-меню, ведущие в категории (ЧПУ /catalog/{slug} или легаси query),
  // в отдельный список не попадают — иначе они дублируют дерево.
  const pathCategorySlug = pathname.match(/^\/catalog\/([^/]+)/)?.[1] ?? "";
  const activeCategorySlug = pathCategorySlug || searchParams.get("category") || "";
  const isCategoryLink = (href: string) => Boolean(categorySlugFromHref(href));

  const mobileCatalogItems: NavItem[] = cats
    .filter((c) => c.slug !== CONFIGURATOR_SLUG)
    .map((c) => toNavItem(c.id, c.title, catalogCategoryHref(c.slug), categoryChildren(c)));

  const mobileMenuItems: NavItem[] = (
    cmsNav.length
      ? cmsNav
          .filter((i) => !isCategoryLink(i.href) && !i.categorySlug && !i.categoryId)
          .map((i) => ({
            id: i.id,
            label: i.label,
            href: i.href,
            // дети-категории уже есть в дереве «Каталог» — оставляем только страницы
            children: (i.children ?? []).filter(
              (ch) => !isCategoryLink(ch.href) && !ch.categorySlug && !ch.categoryId,
            ),
          }))
      : [
          { id: "fb-services", label: "Услуги", href: "/services", children: [] },
          { id: "fb-contacts", label: "Контакты", href: "/contacts", children: [] },
        ]
  ).map((i) => toNavItem(i.id, i.label, i.href, (i.children ?? []) as NavChild[]));

  return (
    <header data-chrome="header" className="bg-white">
      <div className="relative mx-auto flex h-[75px] max-w-[1400px] items-center px-4">
        {/* Мобильное меню */}
        <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
          <DrawerTrigger asChild>
            <button
              className="-ml-2 flex size-11 items-center justify-center text-[#062531] lg:hidden"
              aria-label="Меню"
            >
              <Menu className="size-6" />
            </button>
          </DrawerTrigger>
          <DrawerContent side="left" className="max-h-dvh overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border p-4">
              <img src={logoSrc} alt={brand || "Sale Server"} className="h-9 object-contain" />
            </div>
            <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-3">
              <p className="px-3 pb-1 pt-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Каталог
              </p>
              {mobileCatalogItems.map((item) => (
                <DrawerNavBranch
                  key={item.id}
                  item={item}
                  onNavigate={closeMenu}
                  activeSlug={activeCategorySlug}
                />
              ))}
              <DrawerNavBranch
                item={{
                  id: "cfg-btn",
                  label: "Конфигуратор",
                  href: CONFIGURATOR_HREF,
                  children: configuratorChildren,
                }}
                accent
                onNavigate={closeMenu}
                activeSlug={activeCategorySlug}
              />
              {mobileMenuItems.length > 0 && (
                <>
                  <p className="mt-3 border-t border-border px-3 pb-1 pt-3 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    Меню
                  </p>
                  {mobileMenuItems.map((item) => (
                    <DrawerNavBranch
                      key={item.id}
                      item={item}
                      onNavigate={closeMenu}
                      activeSlug={activeCategorySlug}
                    />
                  ))}
                </>
              )}
              <div className="mt-3 space-y-1 border-t border-border px-3 pt-3">
                {phones.map((p) => (
                  <a key={p.href} href={p.href} className="block text-body-sm text-[#062531] hover:text-accent">
                    {p.label}
                  </a>
                ))}
              </div>
            </nav>
          </DrawerContent>
        </Drawer>

        {/* Логотип */}
        <Link  href="/" className="flex shrink-0 items-center" aria-label="На главную">
          <img
            src={logoSrc}
            alt={brand || "Sale Server"}
            className="h-8 max-w-[104px] object-contain xs:h-9 xs:max-w-[130px] sm:h-[44px] sm:max-w-[170px]"
          />
        </Link>

        <DesktopCategoryBar items={navItems} isItemActive={isItemActive} />

        {/* Сетка иконок 2×2: сравнение, избранное / кабинет, корзина — на всех экранах */}
        <div className="ml-auto grid shrink-0 grid-cols-2 lg:ml-0">
          <Link
             href="/account/compare"
            className="flex h-[37px] w-12 items-center justify-center text-[#062531] transition-colors hover:text-accent"
            aria-label="Сравнение"
          >
            <span className="relative">
              <GitCompare className="size-[18px]" />
              {compare.length > 0 && (
                <span className="absolute -right-2 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                  {compare.length}
                </span>
              )}
            </span>
          </Link>
          <Link
             href="/account/favorites"
            className="flex h-[37px] w-12 items-center justify-center text-[#062531] transition-colors hover:text-accent"
            aria-label="Избранное"
          >
            <span className="relative">
              <Heart className="size-[18px]" />
              {favorites.length > 0 && (
                <span className="absolute -right-2 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                  {favorites.length}
                </span>
              )}
            </span>
          </Link>
          <Link
             href="/account"
            className="flex h-[37px] w-12 items-center justify-center text-[#062531] transition-colors hover:text-accent"
            aria-label="Личный кабинет"
          >
            <User className="size-[18px]" />
          </Link>
          <CartDrawer triggerClassName="relative flex h-[37px] w-12 items-center justify-center text-[#062531] transition-colors hover:text-accent" />
        </div>

        <ExpandableSearch />

        <div className="hidden shrink-0 flex-col items-end justify-center px-2 leading-[22px] xl:flex">
          {phones.map((p) => (
            <a key={p.href} href={p.href} className="text-right text-[13px] text-[#06242f] hover:text-accent">
              {p.label}
            </a>
          ))}
        </div>

        <ConfiguratorButton href={CONFIGURATOR_HREF} links={configuratorChildren} />

        {/* Кнопка звонка: до xl (пока блок телефонов скрыт) */}
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center text-[#062531] hover:text-accent xl:hidden"
          aria-label="Позвонить"
          onClick={() => {
            const href = phones[0]?.href;
            if (href) window.location.href = href;
          }}
        >
          <Phone className="size-5" />
        </button>
      </div>
    </header>
  );
}
