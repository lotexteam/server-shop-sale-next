/** Вход в конфигуратор: /configurator (app-страница) редиректит на категорию
 *  /catalog/{CONFIGURATOR_SLUG} с сохранением query. Ссылки в UI ведут на
 *  /configurator — как в store/sp (категория остаётся внутренней целью). */
export const CONFIGURATOR_HREF = "/configurator";
export const CONFIGURATOR_SLUG = "konfigurator";

type CatNode = {
  id: string;
  slug: string;
  title: string;
  parentId?: string | null;
  children?: CatNode[];
};

export function normalizeCatSlug(slug: string): string {
  return slug.toLowerCase().replace(/_/g, "-").replace(/-+/g, "-").trim();
}

/** Канонический адрес категории: плоское ЧПУ /catalog/{slug} (plan.txt P0.4). */
export function catalogCategoryHref(slug: string, _sub?: string): string {
  return `/catalog/${encodeURIComponent(slug)}`;
}

export function isConfiguratorHref(href: string, label = ""): boolean {
  const h = (href || "").toLowerCase();
  const l = label.toLowerCase();
  return (
    h === "/configurator" ||
    h.startsWith("/configurator?") ||
    h === "/konfigurator" ||
    h === `/${CONFIGURATOR_SLUG}` ||
    h === `/catalog/${CONFIGURATOR_SLUG}` ||
    h.includes(`category=${CONFIGURATOR_SLUG}`) ||
    l.includes("конфигуратор")
  );
}

export function categorySlugFromHref(href: string): string | null {
  try {
    const raw = (href || "").trim();
    const u = raw.startsWith("http") ? new URL(raw) : new URL(raw, "http://local.invalid");
    // ЧПУ — приоритет; легаси ?category= тоже принимаем.
    const m = u.pathname.match(/^\/catalog\/([^/]+)\/?$/);
    if (m) return decodeURIComponent(m[1]);
    const q = u.searchParams.get("category");
    if (q) return decodeURIComponent(q);
  } catch {
    const path = (href.split("?")[0] || "").match(/^\/catalog\/([^/]+)\/?$/);
    if (path) return decodeURIComponent(path[1]);
    const query = href.split("?")[1] || "";
    return new URLSearchParams(query).get("category");
  }
  return null;
}

export function findCategoryBySlug<T extends CatNode>(nodes: T[], slug: string): T | undefined {
  const want = normalizeCatSlug(slug);
  for (const n of nodes) {
    if (normalizeCatSlug(n.slug) === want) return n;
    const hit = findCategoryBySlug((n.children ?? []) as T[], slug);
    if (hit) return hit;
  }
  return undefined;
}

export function findCategoryById<T extends CatNode>(nodes: T[], id: string): T | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findCategoryById((n.children ?? []) as T[], id);
    if (hit) return hit;
  }
  return undefined;
}

export function findCategoryForNav<T extends CatNode>(
  nodes: T[],
  slug: string | null | undefined,
  title?: string,
  id?: string | null,
): T | undefined {
  const name = (title || "").trim().toLowerCase();
  const walkTitle = (list: T[]): T | undefined => {
    for (const n of list) {
      if (n.title.trim().toLowerCase() === name) return n;
      const hit = walkTitle((n.children ?? []) as T[]);
      if (hit) return hit;
    }
    return undefined;
  };

  const byId = id ? findCategoryById(nodes, id) : undefined;
  const byTitle = name ? walkTitle(nodes) : undefined;
  const bySlug = slug ? findCategoryBySlug(nodes, slug) : undefined;
  const ranked = [byId, byTitle, bySlug].filter((n): n is T => Boolean(n));
  return ranked.find((n) => (n.children?.length ?? 0) > 0) ?? ranked[0];
}

/** If the API returned a flat list, rebuild parent → children from parentId. */
export function assembleCategoryTree<T extends CatNode>(items: T[]): T[] {
  if (items.some((i) => (i.children?.length ?? 0) > 0)) return items;
  if (!items.some((i) => i.parentId)) return items;

  const byId = new Map(items.map((i) => [i.id, { ...i, children: [] as T[] }]));
  const roots: T[] = [];
  for (const i of items) {
    const node = byId.get(i.id)!;
    const parent = i.parentId ? byId.get(i.parentId) : undefined;
    if (parent) {
      parent.children = [...((parent.children ?? []) as T[]), node];
    } else {
      roots.push(node);
    }
  }
  return roots;
}
