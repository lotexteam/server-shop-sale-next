# Журнал sale-ui → sale-next

## 2026-10-08 — Styled preflight 404

Preflight 404 теперь отдаёт полноценную inline-styled брендированную страницу вместо технического HTML: логотип, крупный код 404, текст, адаптивные кнопки «На главную» и «В каталог». HTTP status, noindex и fail-open поведение сохранены.

## 2026-10-08 — Preflight 404 для dynamic SEO URL

Добавлен middleware preflight для `/product/*`, `/catalog/*` и `/blog/*`: при явном `kind=not_found` от Laravel `/seo/document` он возвращает HTTP 404 до начала Next streaming. При timeout, сетевой ошибке, redirect или существующей странице запрос передаётся дальше без изменения поведения. Проверено на standalone с production API: отсутствующая категория — 404, существующий товар — 200.

## 2026-10-08 — Зеркальный SEO SSR-аудит

Во всех трёх Next-витринах убрана внешняя Suspense-граница вокруг page tree, а подтверждённый `kind=not_found` обрабатывается также в `generateMetadata` до рендера body. Неиспользуемый клиентский `fetchSeoDocument` удалён; серверный SEO-контракт Laravel и локальная Header Suspense-граница сохранены. `typecheck` и `build` прошли. HTTP 200 с телом 404 требует отдельной проверки после production deploy из-за streaming-ограничения Next 16.


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
- ✅ **Caddy на стенде перечитан** (2026-09-23): боты получают 200 (было 404 от
  Laravel на удалённый `/seo/html`), `@static_media` применился. Корень — невалидный
  Caddyfile (`handle` принимает один матчер), разбор в `server-shop/docs/ai-agent/updates/`.
- ✅ **P1.1 — кэш серверных данных**: `src/lib/server-data.ts` вместо `cache:"no-store"`
  использует `next:{revalidate}` — категории 300 c, карточка/список товара 60 c;
  SSR больше не обходит API на каждый запрос.
- ⏳ Осталось: HTML/ISR-кэш страниц (P1.1), P1.5 шрифты (Roboto ×20 файлов — аудит
  подмножеств), настоящий 410 (сейчас 404+noindex).
