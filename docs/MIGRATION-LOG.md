# Журнал sale-ui → sale-next

Пилот и полный рецепт со всеми уроками — `server-shop-sp-next/docs/MIGRATION-LOG.md`.
Здесь только отличия sale-витрины и последующие волны.

## Отличия от пилота (sp-next)

- Шрифты: **Roboto Condensed** (300/400/500/700, cyrillic+latin) вместо Inter Variable.
- `src/lib/server-data.ts` (SEO/перф-волна 2026-09-23): имена серверных хелперов
  отличаются от sp-next — `getProductServer`, `fetchProductsServer({page, per_page})`,
  `getCategoriesServer`, `applyCatalogFilter`.
- `CatalogPage` дополнительно принимает `initialTotal` (SSR-текст «Найдено N товаров»).
- В sale-витрине есть свои страницы/компоненты без аналога в sp-next: `proposal`,
  `contacts`, `info/ProposalPage`.

## SEO/перф-волна 2026-09-23 — SSR-контент, честный 404, dedup fetch

План и статус: `server-shop/docs/SEO-PERF-NEXT-PLAN-2026-09.md` (раздел «Статус выполнения»).

- ✅ **P0.1 контент в SSR-HTML**: `src/lib/server-data.ts` (те же endpoint'ы, что у
  клиентских хуков), `initialProduct`/`initialProducts`/`initialCategories`/`initialTotal`
  в `ProductPage`/`CatalogPage`/`HomePage`, подключено в `app/{page,catalog,catalog/[slug],product/[slug]}`.
- ✅ **P0.2 честный 404**: `kind=not_found` больше не сворачивается в `null`,
  `pageSeo` отдаёт `notFound: boolean`, страницы зовут `notFound()`.
- ✅ **P0.3 dedup**: `pageSeo = cache(pageSeoImpl)` + `force-cache`/`revalidate 60`
  для `/settings/site`; `/seo/document` — `no-store`.
- ✅ **P1.4** клиентский `usePageMeta` убран из ProductPage/ArticlePage/ContactsPage/
  ProposalPage/ConfigurableProductView, оставлен только в `NotFoundPage`.
- ✅ **P1.2 framer-motion убран из бандла.** Библиотека импортировалась в 5 клиентских
  файлов (`ProductCard`, `layout/MegaMenu`, `ui/toast`, `compare/CompareBar`,
  `views/NotFoundPage`) и ехала в бандле каждой страницы. Анимации переведены на CSS
  (`src/index.css`: `menu-/toast-/bar-/pop-in|out`) + новый хук `src/hooks/usePresence.ts`
  (держит элемент в DOM, пока играет CSS-выход; у тостов — свой список `leaving`).
  Классы уважают `prefers-reduced-motion`. `tsc --noEmit` — 0 ошибок; `next build` —
  «Compiled successfully». Отличия от sp-next: здесь нет `WhyStorySection` и framer в
  `Header`, поэтому направленные `story-enter-*` не добавлялись.
- ✅ **Наблюдаемость серверного слоя** (инцидент стенда 2026-09-23): `serverGet` в
  `src/lib/seo-server.ts` (обе ветки — `no-store` и `force-cache`) и
  `src/lib/server-data.ts` больше не глушит причину деградации — пишет
  `[seo-server]`/`[storefront-server] <path> → HTTP <status>` или `сбой запроса: …`
  в лог витрины (`docker logs`). В `seo-server` тело читается и на 404/410:
  `SeoDocumentBuilder` может отдать документ (`kind`/`http_status`) таким статусом —
  это факт отсутствия (страница отдаёт `notFound()`), а не сбой API. `404` на
  `/products/{slug}` намеренно не логируется — штатное «нет товара».
  Разбор: `server-shop/docs/ai-agent/updates/2026-09-23-caddy-reload-after-frontend.md`.
- ⏳ Осталось: рантайм-верификация бот-UA на стенде (локально нет API/Docker; на
  `new.server-price.ru` боты получают 404 — живой конфиг Caddy всё ещё содержит
  `@bot`-роут на удалённый `/seo/html`, одной перегенерации файла мало, нужен
  `caddy reload`, см. `server-shop/docs/SEO-PERF-NEXT-PLAN-2026-09.md`); P1.1 ISR,
  P1.5 шрифты (Roboto ×20 файлов — аудит подмножеств); настоящий 410 (сейчас 404+noindex).
