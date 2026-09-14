"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, LayoutGrid, List, X } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { ProductCard } from "@/components/ProductCard";
import { ProductPhoto } from "@/components/product/ProductPhoto";
import { FilterSidebar, type Filters } from "@/components/catalog/FilterSidebar";
import { CategoryChips } from "@/components/catalog/CategoryChips";
import { CONDITION_LABEL, CONDITION_TONE } from "@/data/conditions";
import { formatPrice, cn } from "@/lib/utils";
import { VatHint } from "@/components/common/Price";
import { useShop } from "@/store/shop";
import { useToast } from "@/components/ui/toast";
import type { Category, Product } from "@/data/types";
import Link from "next/link";
import { usePathname, useRouter, useParams, useSearchParams } from "next/navigation";
import { fetchBrands, fetchCatalogFilters, fetchProducts, productPath, categoryHref, type CatalogFilterAttr } from "@/lib/api";
import { useCategories } from "@/hooks/useCategories";

const emptyFilters: Filters = {
  categories: [],
  brands: [],
  conditions: [],
  attributes: {},
  attributeRanges: {},
};

type Sort = "popular" | "price-asc" | "price-desc";
const sortLabels: Record<Sort, string> = {
  popular: "По популярности",
  "price-asc": "Сначала дешёвые",
  "price-desc": "Сначала дорогие",
};

const PAGE_SIZE = 12;

function findCategoryBySlug(nodes: Category[], slug: string): Category | undefined {
  for (const n of nodes) {
    if (n.slug === slug) return n;
    const kids = (n.children ?? []) as Category[];
    const hit = findCategoryBySlug(kids, slug);
    if (hit) return hit;
  }
  return undefined;
}

/** Родитель категории в дереве (для чипов/крошек на плоском ЧПУ /catalog/{child}). */
function findParentOfSlug(nodes: Category[], slug: string): Category | undefined {
  for (const n of nodes) {
    const kids = (n.children ?? []) as Category[];
    if (kids.some((k) => k.slug === slug)) return n;
    const hit = findParentOfSlug(kids, slug);
    if (hit) return hit;
  }
  return undefined;
}

function flattenSubs(
  nodes: Array<{ id: string; slug: string; title: string; children?: unknown[] }>,
): Array<{ id: string; slug: string; title: string }> {
  const out: Array<{ id: string; slug: string; title: string }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, slug: n.slug, title: n.title });
    if (n.children?.length) {
      out.push(...flattenSubs(n.children as Array<{ id: string; slug: string; title: string; children?: unknown[] }>));
    }
  }
  return out;
}

/**
 * Стабильный сайдбар: значения/блоки, пропавшие после сужения фильтров,
 * остаются на месте в неактивном виде (серым, count=0) — видно, что
 * пропало и что вернётся при ослаблении выбора. Призраки живут один шаг:
 * неактуальные (бывшие призраки) выкидываются, чтобы сайдбар не рос.
 */
function mergeFacets(next: CatalogFilterAttr[], prev: CatalogFilterAttr[]): CatalogFilterAttr[] {
  const nextByCode = new Map(next.map((a) => [a.code, a]));
  const out: CatalogFilterAttr[] = [];
  const seen = new Set<string>();

  for (const p of prev) {
    seen.add(p.code);
    const cur = nextByCode.get(p.code);
    if (!cur) {
      // Пропал целиком: если и раньше был призраком — выбрасываем,
      // иначе оставляем неактивным (один шаг истории).
      if (p.inactive) continue;
      out.push({
        ...p,
        inactive: true,
        values: p.values.map((v) => ({ ...v, count: 0, available: false, selected: false })),
      });
      continue;
    }
    const curByValue = new Map(cur.values.map((v) => [v.value, v]));
    const values: CatalogFilterAttr["values"] = [];
    for (const pv of p.values) {
      const cv = curByValue.get(pv.value);
      if (cv) values.push(cv);
      else values.push({ ...pv, count: 0, available: false, selected: false });
    }
    const prevValues = new Set(p.values.map((v) => v.value));
    for (const cv of cur.values) {
      if (!prevValues.has(cv.value)) values.push(cv);
    }
    out.push({ ...cur, values });
  }

  for (const a of next) {
    if (!seen.has(a.code)) out.push(a);
  }

  return out;
}

function sameValues(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/*
 * URL — источник истины каталога (SEO-аудит 2026-09): сортировка, страница и
 * все фильтры сериализуются в query, поэтому страницы каталога шарятся,
 * работают кнопки «назад/вперёд», а серверный /seo/document на каждый
 * такой адрес отвечает честным noindex,follow + чистым каноникалом.
 *
 * Формат параметров (значения списка — через запятую, URL-кодированные):
 *   page=2               — страница пагинации
 *   sort=price-asc       — popular (дефолт, не пишется) | price-asc | price-desc
 *   brand=id1,id2        — выбранные бренды (id)
 *   condition=new,used   — состояние
 *   cats=slug1,slug2     — доп. категории чекбоксами (текущая в пути не дублируется)
 *   attr-{code}=v1,v2    — значения атрибутных фильтров
 *   min-{code}/max-{code}— числовые диапазоны
 * Мусор в URL игнорируется; «мёртвые» значения убирает prune-эффект фасетов.
 */
const CATALOG_CONDITIONS = ["new", "used"] as const;

type CatalogUrlState = { filters: Filters; sort: Sort; page: number };

function positiveIntParam(params: URLSearchParams, key: string): number {
  const raw = params.get(key);
  if (raw == null || raw === "") return 1;
  const n = Number(raw);

  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function decodeList(raw: string | null): string[] {
  if (!raw) return [];

  return raw.split(",").map(decodeURIComponent).filter(Boolean);
}

function parseCatalogState(params: URLSearchParams, urlCategory: string): CatalogUrlState {
  const attributes: Filters["attributes"] = {};
  const attributeRanges: Filters["attributeRanges"] = {};
  params.forEach((raw, key) => {
    if (key.startsWith("attr-")) {
      const code = key.slice("attr-".length);
      const values = decodeList(raw);
      if (code !== "" && values.length > 0) attributes[code] = values;
    } else if (key.startsWith("min-") || key.startsWith("max-")) {
      const code = key.slice(4);
      const n = Number(raw);
      if (code === "" || !Number.isFinite(n)) return;
      const range = attributeRanges[code] ?? {};
      if (key.startsWith("min-")) range.min = n;
      else range.max = n;
      attributeRanges[code] = range;
    }
  });
  const cats = decodeList(params.get("cats"));
  const categories = Array.from(new Set([urlCategory, ...cats].filter(Boolean)));
  const sortParam = params.get("sort");
  const sort: Sort =
    sortParam === "price-asc" || sortParam === "price-desc" ? sortParam : "popular";

  return {
    filters: {
      ...emptyFilters,
      categories,
      brands: decodeList(params.get("brand")),
      conditions: decodeList(params.get("condition")).filter((c): c is (typeof CATALOG_CONDITIONS)[number] =>
        (CATALOG_CONDITIONS as readonly string[]).includes(c),
      ),
      attributes,
      attributeRanges,
    },
    sort,
    page: positiveIntParam(params, "page"),
  };
}

function catalogStateToParams(
  filters: Filters,
  sort: Sort,
  page: number,
  urlCategory: string,
): URLSearchParams {
  const params = new URLSearchParams();
  const extraCats = filters.categories.filter((c) => c !== urlCategory);
  if (extraCats.length > 0) params.set("cats", extraCats.map(encodeURIComponent).join(","));
  if (filters.brands.length > 0) params.set("brand", filters.brands.map(encodeURIComponent).join(","));
  if (filters.conditions.length > 0) params.set("condition", filters.conditions.join(","));
  for (const [code, values] of Object.entries(filters.attributes)) {
    if (values.length > 0) params.set(`attr-${code}`, values.map(encodeURIComponent).join(","));
  }
  for (const [code, range] of Object.entries(filters.attributeRanges)) {
    if (range.min != null) params.set(`min-${code}`, String(range.min));
    if (range.max != null) params.set(`max-${code}`, String(range.max));
  }
  if (sort !== "popular") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  return params;
}

/**
 * @param initialProducts — SSR-первая страница каталога (fetchProductsServer
 * + фильтр cfg-opt-*). SSR рендерит H1/карточки/цены; клиентский effect
 * сохраняет полную логику загрузки и пропускает повторный fetch, если
 * та же выборка (page=1, без фильтров) уже отрендерена.
 * @param initialCategories — SSR-дерево категорий (getCategoriesServer).
 * @param initialTotal — meta.total для SSR-текста «Найдено N товаров».
 */
export function CatalogPage({
  initialProducts = undefined,
  initialCategories = undefined,
  initialTotal = undefined,
}: {
  initialProducts?: Product[] | null;
  initialCategories?: Category[] | null;
  /** Реальный total SSR-предзагруженной страницы (из meta.total /products) — для SSR-текста. */
  initialTotal?: number;
} = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // next/navigation не имеет setSearchParams — этот хелпер повторяет
  // setSearchParams(params, { replace: true }) из react-router
  // (все записи состояния каталога в URL должны заменять историю).
  const applyParams = (next: URLSearchParams) => {
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  };
  // ЧПУ /catalog/{slug} — основной формат; легаси ?category= продолжает
  // работать (бот-HTML отдаёт на него 301, серверные метаданные ведут дальше).
  const routeParams = useParams();
  const pathSlug = typeof routeParams.slug === "string" ? routeParams.slug : undefined;
  const urlQuery = searchParams.get("q") ?? "";
  const urlCategory = pathSlug ?? searchParams.get("category") ?? "";
  const urlSub = searchParams.get("sub") ?? "";

  const { categories, loading: catsLoading } = useCategories();

  // Состояние каталога выводится из URL (см. parseCatalogState): фильтры,
  // сортировка и страница живут в адресе, а не в React-state.
  const { filters, sort, page } = useMemo(
    () => parseCatalogState(searchParams, urlCategory),
    [searchParams, urlCategory],
  );
  const [view, setView] = useState<"grid" | "list">("grid");
  const [pageItems, setPageItems] = useState<Product[]>(initialProducts ?? []);
  const [total, setTotal] = useState<number>(initialTotal ?? 0);
  const [productsLoading, setProductsLoading] = useState(initialProducts == null);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [facets, setFacets] = useState<CatalogFilterAttr[]>([]);
  const [facetsLoading, setFacetsLoading] = useState(true);
  // Последний отрендеренный набор фасетов — источник «призраков» при слиянии.
  const lastFacetsRef = useRef<CatalogFilterAttr[]>([]);
  // Категорийная область последнего запроса фасетов: при её смене призраки
  // сбрасываются — заголовки категорийных групп строятся под новую область.
  const facetScopeRef = useRef("");
  const { addToCart, toggleFav } = useShop();
  const { push } = useToast();

  /** Транзитные ключи адреса, не относящиеся к фильтрам каталога. */
  const PASSTHROUGH_KEYS = ["q", "sub", "category"] as const;
  const withPassthrough = (params: URLSearchParams): URLSearchParams => {
    for (const key of PASSTHROUGH_KEYS) {
      const v = searchParams.get(key);
      if (v != null) params.set(key, v);
    }

    return params;
  };

  const writeCatalogState = (next: { filters?: Filters; sort?: Sort; page?: number }) => {
    const params = catalogStateToParams(
      next.filters ?? filters,
      next.sort ?? sort,
      next.page ?? page,
      urlCategory,
    );
    applyParams(withPassthrough(params));
  };

  /** href страницы пагинации — обычная ссылка (краулинг/шаринг). */
  const pageHref = (p: number) => {
    const params = withPassthrough(catalogStateToParams(filters, sort, p, urlCategory));
    const qs = params.toString();

    return qs ? `${pathname}?${qs}` : pathname;
  };
  const add = (p: Product) => {
    addToCart(p);
    push({ variant: "success", title: "Добавлено в корзину", description: p.title, action: { label: "Перейти к оформлению", onClick: () => router.push("/checkout") } });
  };
  const fav = (p: Product) => {
    toggleFav(p);
    push({ variant: "info", title: "Избранное обновлено" });
  };

  const activeCategory = urlCategory
    ? findCategoryBySlug(categories, urlCategory)
    : undefined;
  const activeSub =
    activeCategory && urlSub
      ? flattenSubs(activeCategory.children ?? []).find((s) => s.slug === urlSub)
      : undefined;
  // На плоском ЧПУ адрес ребёнка не содержит родителя — контекст дерева
  // восстанавливаем для крошек и чипов соседних подкатегорий.
  const parentCategory = urlCategory && !activeSub
    ? findParentOfSlug(categories, urlCategory)
    : undefined;

  // Смена категории в адресе — новый контекст: фильтры сбрасываются самим
  // переходом (ссылки категорий не несут query), призраков фасетов не
  // переносим — область отслеживает facetScopeRef ниже.

  // Справочник брендов — один запрос на страницу, сайдбары получают его в пропсах.
  useEffect(() => {
    let cancelled = false;
    void fetchBrands()
      .then((list) => {
        if (!cancelled) setBrands(list.map((b) => ({ id: b.id, name: b.name })));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // SSR-guard: если первая страница уже отрендерена из initialProducts
  // (page=1, сортировка popular, без фильтров) — повторный fetch не нужен,
  // содержимое идентично SSR-версии.
  const ssrConsumedRef = useRef(false);

  useEffect(() => {
    if (catsLoading && (urlCategory || filters.categories.length)) return;
    const ssrFirstPage =
      initialProducts != null &&
      initialProducts.length > 0 &&
      !ssrConsumedRef.current &&
      page === 1 &&
      sort === "popular" &&
      urlQuery === "" &&
      urlCategory === "" &&
      urlSub === "" &&
      filters.categories.length === 0 &&
      filters.brands.length === 0 &&
      filters.conditions.length === 0 &&
      Object.keys(filters.attributes).length === 0 &&
      Object.keys(filters.attributeRanges).length === 0;
    if (ssrFirstPage) {
      ssrConsumedRef.current = true;
      setProductsLoading(false);
      return;
    }
    let cancelled = false;
    setProductsLoading(true);
    void (async () => {
      try {
        const categoryIds = (urlSub
          ? [urlSub]
          : filters.categories.length
            ? filters.categories
            : []
        )
          .map((slug) => findCategoryBySlug(categories, slug)?.id)
          .filter((id): id is string => Boolean(id));
        let isNew: boolean | undefined;
        if (filters.conditions.length === 1) {
          isNew = filters.conditions[0] === "new";
        }
        const res = await fetchProducts({
          page,
          per_page: PAGE_SIZE,
          q: urlQuery || undefined,
          category_ids: categoryIds,
          brand_ids: filters.brands,
          is_new: isNew,
          attr: filters.attributes,
          attr_ranges: filters.attributeRanges,
          sort: sort === "popular" ? undefined : sort,
        });
        if (cancelled) return;
        setPageItems(res.items.filter((p) => !p.slug.startsWith("cfg-opt-")));
        setTotal(res.total);
      } catch {
        if (!cancelled) {
          setPageItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, sort, urlQuery, urlCategory, urlSub, filters, categories, catsLoading]);

  // Умные фасеты: те же критерии, что у списка товаров (без page/sort).
  // Бэкенд сам считает каждый блок disjunctive — с остальными фильтрами,
  // кроме выбора в самом блоке.
  useEffect(() => {
    if (catsLoading && (urlCategory || filters.categories.length)) return;
    let cancelled = false;
    setFacetsLoading(true);
    void (async () => {
      try {
        const categoryIds = (urlSub
          ? [urlSub]
          : filters.categories.length
            ? filters.categories
            : []
        )
          .map((slug) => findCategoryBySlug(categories, slug)?.id)
          .filter((id): id is string => Boolean(id));
        let isNew: boolean | undefined;
        if (filters.conditions.length === 1) {
          isNew = filters.conditions[0] === "new";
        }
        // Смена категорийной области (чекбокс категории) — новая структура
        // групп: призраки не переносятся (URL-переходы сбрасывают их выше).
        const scopeKey = categoryIds.join("|");
        const scopeChanged = facetScopeRef.current !== scopeKey;
        if (scopeChanged) facetScopeRef.current = scopeKey;
        const list = await fetchCatalogFilters({
          q: urlQuery || undefined,
          category_ids: categoryIds,
          brand_ids: filters.brands.length ? filters.brands : undefined,
          is_new: isNew,
          attr: filters.attributes,
          attr_ranges: filters.attributeRanges,
        });
        if (!cancelled) {
          // Слияние с прошлым рендером: пропавшее остаётся неактивным.
          const merged = mergeFacets(list, scopeChanged ? [] : lastFacetsRef.current);
          lastFacetsRef.current = merged;
          setFacets(merged);
        }
      } catch {
        // При ошибке сети оставляем прежние фасеты на месте — без прыжков.
      } finally {
        if (!cancelled) setFacetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlQuery, urlCategory, urlSub, filters, categories, catsLoading]);

  // Prune: значения фильтров, пропавшие из ответа фасетов, убираем и из URL —
  // адрес не должен нести мёртвые значения (URL теперь источник истины).
  // До загрузки фасетов ([]) ничего не трогаем.
  useEffect(() => {
    if (facets.length === 0) return;
    const facetsByCode = new Map(facets.map((facet) => [facet.code, facet]));
    let changed = false;
    const attributes: Filters["attributes"] = {};
    for (const [code, selected] of Object.entries(filters.attributes)) {
      const facet = facetsByCode.get(code);
      const allowed = new Set(facet?.values.map((value) => value.value) ?? []);
      const next = selected.filter((value) => allowed.has(value));
      if (!sameValues(next, selected)) changed = true;
      if (next.length) attributes[code] = next;
    }

    const attributeRanges: Filters["attributeRanges"] = {};
    for (const [code, range] of Object.entries(filters.attributeRanges)) {
      const facet = facetsByCode.get(code);
      const isNumeric = facet?.filter_mode === "numeric";
      const min = range.min != null && isNumeric && (facet?.max == null || range.min <= facet.max)
        ? range.min
        : undefined;
      const max = range.max != null && isNumeric && (facet?.min == null || range.max >= facet.min)
        ? range.max
        : undefined;
      if (min == null && max == null) {
        changed = true;
        continue;
      }
      if (min !== range.min || max !== range.max) changed = true;
      attributeRanges[code] = { ...(min != null ? { min } : {}), ...(max != null ? { max } : {}) };
    }

    if (!changed) return;
    applyParams(
      withPassthrough(catalogStateToParams({ ...filters, attributes, attributeRanges }, sort, page, urlCategory)),
    );
    // Ограниченно намеренно: повторяем только когда пришёл новый ответ фасетов.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facets]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categoryLabel = (slug: string) =>
    findCategoryBySlug(categories, slug)?.title ?? slug;

  const applyFilters = (next: Filters) => {
    // Чекбокс категории меняет область поиска — атрибутные выборы сбрасываем
    // сразу; фасетный ответ выполняет более тонкую чистку значений (prune).
    const base = sameValues(filters.categories, next.categories)
      ? next
      : { ...next, attributes: {}, attributeRanges: {} };
    writeCatalogState({ filters: base, page: 1 });
  };

  const resetFilters = () => {
    writeCatalogState({
      filters: { ...emptyFilters, categories: urlCategory ? [urlCategory] : [] },
      page: 1,
    });
  };

  const activeChips = [
    ...(urlQuery
      ? [
          {
            key: "q",
            label: `Поиск: «${urlQuery}»`,
            clear: () => {
              const next = new URLSearchParams(searchParams);
              next.delete("q");
              next.delete("page");
              applyParams(next);
            },
          },
        ]
      : []),
    ...(activeSub
      ? [
          {
            key: "sub",
            label: activeSub.title,
            clear: () => {
              const next = new URLSearchParams(searchParams);
              next.delete("sub");
              next.delete("page");
              applyParams(next);
            },
          },
        ]
      : []),
    ...filters.categories.map((c) => ({
      key: `cat-${c}`,
      label: categoryLabel(c),
      clear: () => {
        const remaining = filters.categories.filter((x) => x !== c);
        const params = withPassthrough(
          catalogStateToParams({ ...filters, categories: remaining }, sort, 1, urlCategory),
        );
        if (urlCategory === c) {
          // Сняли категорию самого адреса — уходим в корень каталога.
          params.delete("category");
          params.delete("sub");
          const qs = params.toString();
          router.push(qs ? `/catalog?${qs}` : "/catalog");
        } else {
          applyParams(params);
        }
      },
    })),
    ...filters.brands.map((b) => ({
      key: `br-${b}`,
      label: brands.find((x) => x.id === b)?.name ?? b,
      clear: () => {
        writeCatalogState({
          filters: { ...filters, brands: filters.brands.filter((x) => x !== b) },
          page: 1,
        });
      },
    })),
    ...filters.conditions.map((c) => ({
      key: `co-${c}`,
      label: CONDITION_LABEL[c],
      clear: () => {
        writeCatalogState({
          filters: { ...filters, conditions: filters.conditions.filter((x) => x !== c) },
          page: 1,
        });
      },
    })),
    ...Object.entries(filters.attributes).flatMap(([code, vals]) =>
      vals.map((v) => ({
        key: `attr-${code}-${v}`,
        label: v,
        clear: () => {
          const next = (filters.attributes[code] ?? []).filter((x) => x !== v);
          const attributes = { ...filters.attributes };
          if (next.length) attributes[code] = next;
          else delete attributes[code];
          writeCatalogState({ filters: { ...filters, attributes }, page: 1 });
        },
      })),
    ),
  ];

  // Скелетоны — только при первой загрузке; при смене фильтров старая
  // выдача остаётся на месте (приглушается), чтобы страница не прыгала.
  const showSkeletons = catsLoading || (productsLoading && pageItems.length === 0);

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs
        items={[
          { label: "Каталог", href: "/catalog" },
          ...(parentCategory
            ? [{ label: parentCategory.title, href: categoryHref(parentCategory.slug) }]
            : []),
          ...(activeSub && activeCategory
            ? [
                { label: activeCategory.title, href: categoryHref(activeCategory.slug) },
                { label: activeSub.title },
              ]
            : activeCategory
              ? [{ label: activeCategory.title }]
              : []),
        ]}
        className="mb-4"
      />
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-h2">
          {activeSub?.title ?? activeCategory?.title ?? "Каталог оборудования"}
        </h1>
        <p className="text-body text-muted-foreground">
          {catsLoading ? "Загрузка…" : `Найдено ${total} товаров`}
          {urlQuery ? (
            <span>
              {" "}
              по запросу <span className="font-semibold text-foreground">«{urlQuery}»</span>
            </span>
          ) : null}
        </p>
        {activeCategory?.children && activeCategory.children.length > 0 ? (
          <CategoryChips
            parentSlug={activeCategory.slug}
            activeSubSlug={urlSub || undefined}
            items={flattenSubs(activeCategory.children)}
          />
        ) : parentCategory?.children && parentCategory.children.length > 0 ? (
          // Ребёнок без своих веток: показываем чипы соседних подкатегорий
          // родителя — навигация не теряется на плоском ЧПУ.
          <CategoryChips
            parentSlug={parentCategory.slug}
            activeSubSlug={urlCategory}
            items={flattenSubs(parentCategory.children)}
          />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
        <aside className="hidden lg:sticky lg:top-[var(--header-offset)] lg:block lg:self-start">
          <div className="surface-card max-h-[calc(100dvh-var(--header-offset)-1.5rem)] overflow-y-auto overscroll-contain p-5 scrollbar-thin">
            <FilterSidebar
              filters={filters}
              categories={categories}
              brands={brands}
              facets={facets}
              facetsLoading={facetsLoading}
              onChange={applyFilters}
              onReset={resetFilters}
            />
          </div>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="size-4" /> Фильтры
                </Button>
              </DrawerTrigger>
              <DrawerContent side="left" className="w-80 overflow-y-auto scrollbar-thin">
                <FilterSidebar
                  filters={filters}
                  categories={categories}
                  brands={brands}
                  facets={facets}
                  facetsLoading={facetsLoading}
                  onChange={applyFilters}
                  onReset={resetFilters}
                />
              </DrawerContent>
            </Drawer>

            <div className="ml-auto flex items-center gap-3">
              <Select
                value={sort}
                onValueChange={(v) => writeCatalogState({ sort: v as Sort, page: 1 })}
              >
                <SelectTrigger className="h-10 w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(sortLabels) as Sort[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {sortLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="hidden items-center gap-1 rounded-md border border-input bg-card p-1 sm:flex">
                <button
                  onClick={() => setView("grid")}
                  className={cn(
                    "flex size-8 items-center justify-center rounded",
                    view === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:text-primary",
                  )}
                  aria-label="Плиткой"
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={cn(
                    "flex size-8 items-center justify-center rounded",
                    view === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-primary",
                  )}
                  aria-label="Списком"
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeChips.map((c) => (
                <button
                  key={c.key}
                  onClick={c.clear}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-caption font-medium transition-colors hover:bg-muted"
                >
                  {c.label} <X className="size-3" />
                </button>
              ))}
              <button
                onClick={() => {
                  resetFilters();
                }}
                className="text-caption font-medium text-primary hover:underline"
              >
                Сбросить всё
              </button>
            </div>
          )}

          {showSkeletons ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-lg" />
              ))}
            </div>
          ) : pageItems.length === 0 ? (
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить параметры фильтра или сбросить их."
              action={
                <Button
                  variant="gradient"
                  onClick={() => {
                    resetFilters();
                  }}
                >
                  Сбросить фильтры
                </Button>
              }
            />
          ) : view === "grid" ? (
            <div
              className={cn(
                "grid grid-cols-1 gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                productsLoading && "pointer-events-none opacity-60",
              )}
            >
              {pageItems.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={add} onFav={fav} />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "space-y-4 transition-opacity",
                productsLoading && "pointer-events-none opacity-60",
              )}
            >
              {pageItems.map((p) => {
                const discount = p.oldPrice && p.price != null
                  ? Math.round((1 - p.price / p.oldPrice) * 100)
                  : 0;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover sm:flex-row"
                  >
                    <Link
                       href={productPath(p)}
                      className="aspect-[4/3] w-full overflow-hidden rounded-md bg-secondary sm:w-48 sm:shrink-0"
                    >
                      <ProductPhoto
                        src={p.image}
                        alt={p.title}
                        title={p.title}
                        width={400}
                        height={300}
                        sizes="(min-width: 640px) 12rem, 90vw"
                        className="size-full object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-caption font-semibold",
                              CONDITION_TONE[p.condition],
                            )}
                          >
                            {CONDITION_LABEL[p.condition]}
                          </span>
                          <Link
                             href={productPath(p)}
                            className="mt-2 block text-h6 hover:text-primary"
                          >
                            {p.title}
                          </Link>
                        </div>
                        {discount > 0 && <Badge variant="accent">-{discount}%</Badge>}
                      </div>
                      <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-caption text-muted-foreground sm:grid-cols-3">
                        {p.specs.map((s) => (
                          <li key={s.label} className="flex justify-between gap-2">
                            <span>{s.label}</span>
                            <span className="font-medium text-foreground/80">{s.value}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                        <div>
                          {p.onRequest ? (
                            <div className="text-h4 font-bold">Под заказ</div>
                          ) : (
                            <>
                              {p.oldPrice && (
                                <div className="text-caption text-muted-foreground line-through">
                                  {formatPrice(p.oldPrice)}
                                </div>
                              )}
                              <div className="text-h4 font-bold">
                                {p.price == null ? "Под заказ" : formatPrice(p.price)}
                              </div>
                              <VatHint />
                            </>
                          )}
                        </div>
                        <Button variant="gradient" className="text-white" onClick={() => add(p)}>
                          В корзину
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!catsLoading && total > PAGE_SIZE && (
            <div
              className={cn(
                "mt-8 flex justify-center transition-opacity",
                productsLoading && "pointer-events-none opacity-60",
              )}
            >
              <Pagination page={page} total={totalPages} href={pageHref} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
