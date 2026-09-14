/**
 * Серверный слой данных витрины (только Node-рантайм).
 *
 * По образцу lib/seo-server.ts: та же база API_BASE_SERVER, тот же
 * сайт-контекст X-Seo-Site мультиинстанс-бэкенда, cache:"no-store",
 * таймаут 4 c, любая ошибка → null (страница деградирует в 404/фолбэк,
 * но не роняет SSR-рендер, например во время next build).
 *
 * Используются ТЕ ЖЕ витринные endpoint'ы, что и у клиентских хуков:
 *   - GET /products/{slug}        (клиентский fetchProduct в lib/api.ts)
 *   - GET /products?page&per_page (клиентский fetchProducts в lib/api.ts)
 *   - GET /categories?tree=1      (клиентский fetchCategories в lib/api.ts)
 *
 * Маппинг DTO→Product переиспользуется дословно из lib/api.ts
 * (mapApiProduct / mapApiCategory — чистые функции), чтобы результат
 * серверного фетча был ИДЕНТИЧЕН клиентскому. lib/api.ts безопасно
 * импортировать с сервера: на его верхнем уровне нет браузерных API —
 * localStorage трогается только внутри функций, а импорты верхнего
 * уровня (@/data/types — типы, @/lib/placeholder, @/lib/api-base) чистые.
 */

import type { Category, Product } from "@/data/types";
import { API_BASE_SERVER } from "@/lib/api-base";
import { mapApiProduct, mapApiCategory } from "@/lib/api";

const FETCH_TIMEOUT_MS = 4000;

function appUrlOrigin(): string {
  const raw = (process.env.APP_URL || "").replace(/\/$/, "");
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_SERVER}${path}`, {
      headers: {
        Accept: "application/json",
        // Сайт-контекст мультиинстанс-бэкенда (как X-Seo-Site в SPA-версии).
        ...(appUrlOrigin() ? { "X-Seo-Site": appUrlOrigin() } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      // 404 на /products/{slug} — штатное «нет такого товара» (страница уходит
      // в клиентскую загрузку и отдаёт not found), им лог не шумим. Прочие
      // не-2xx — деградация SSR: HTML приходит без карточек/цен («Загрузка…»),
      // и причину надо видеть в логах витрины, а не угадывать снаружи.
      const expectedMiss = res.status === 404 && path.startsWith("/products/");
      if (!expectedMiss) {
        console.warn(
          `[storefront-server] ${path} → HTTP ${res.status}: SSR-данные не получены (клиентская загрузка)`,
        );
      }
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    // API недоступен (например, во время next build) — вызов деградирует в null.
    console.warn(
      `[storefront-server] ${path} → сбой запроса: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}

type ApiItem<T> = { data?: T | null; meta?: Record<string, number> };

/** Key-нормализация, идентичная клиентскому fetchProduct (decode → trim). */
export function normalizeProductKey(raw: string): string {
  let key = String(raw || "").trim();
  try {
    key = decodeURIComponent(key);
  } catch {
    /* already decoded */
  }
  return key;
}

/**
 * Тот же контракт, что fetchProduct в lib/api.ts: GET /products/{slug}.
 * Клиентский фолбэк через list-search на сервере не дублируется —
 * не найдено → null (страница отвечает 404).
 */
export async function getProductServer(idOrSlug: string): Promise<Product | null> {
  const key = normalizeProductKey(idOrSlug);
  if (!key) return null;
  const res = await serverGet<ApiItem<Parameters<typeof mapApiProduct>[0]>>(
    `/products/${encodeURIComponent(key)}`,
  );
  return res?.data ? mapApiProduct(res.data) : null;
}

/**
 * Тот же shape, что fetchProducts в lib/api.ts:
 * { items, total, page, lastPage } — маппинг идентичен.
 */
export async function fetchProductsServer(params?: {
  page?: number;
  per_page?: number;
  on_sale?: boolean;
}): Promise<{ items: Product[]; total: number; page: number; lastPage: number }> {
  const qs = new URLSearchParams();
  qs.set("per_page", String(params?.per_page ?? 250));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.on_sale) qs.set("filter[on_sale]", "1");
  const res = await serverGet<ApiItem<Parameters<typeof mapApiProduct>[0][]>>(
    `/products?${qs}`,
  );
  if (!res) return { items: [], total: 0, page: 1, lastPage: 1 };
  const items = (res.data || []).map((p) => mapApiProduct(p));
  const meta = res.meta || {};
  return {
    items,
    total: Number(meta.total ?? items.length),
    page: Number(meta.current_page ?? 1),
    lastPage: Number(meta.last_page ?? 1),
  };
}

/** Категории деревом — тот же контракт, что fetchCategories(true) в lib/api.ts. */
export async function getCategoriesServer(): Promise<Category[]> {
  const res = await serverGet<ApiItem<Parameters<typeof mapApiCategory>[0][]>>(
    "/categories?tree=1",
  );
  if (!res) return [];
  return (res.data || []).map((c) => mapApiCategory(c));
}

/**
 * Витринный фильтр каталога — перенесён ДОСЛОВНО из useCatalogProducts.ts
 * (hide zero-price builtin options unless platform).
 */
export function applyCatalogFilter(products: Product[]): Product[] {
  return products.filter(
    (p) =>
      !p.slug.startsWith("cfg-opt-") ||
      (p.price != null && p.price > 0) ||
      p.onRequest ||
      p.slug.startsWith("cfg-platform-"),
  );
}
