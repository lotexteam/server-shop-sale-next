# server-shop-sale-next

Next.js 16 (App Router, SSR) витрина sale-server.ru (скин МВГ Групп). Полная
миграция с легаси React SPA `server-shop-sale-ui` (репозиторий сохранён в архиве,
из рабочей области удалён 2026-09-23) по рецепту `server-shop-sp-next` (см. его
docs/MIGRATION-LOG.md — журнал пилота со всеми уроками).

| | |
|---|---|
| Каркас | Next.js 16 App Router, `output: 'standalone'`, Turbopack (dev) |
| UI | React 19 (client components), Tailwind CSS 3.4, Radix UI, framer-motion |
| Шрифты | Roboto Condensed self-hosted (300/400/500/700, cyrillic+latin) |
| SEO | Серверный `generateMetadata` через Storefront API `/seo/document`; JSON-LD и **контент** (H1/цена/характеристики/карточки) в SSR-HTML; `kind=not_found` → HTTP 404 |
| SEO | Серверный `generateMetadata` через Storefront API `/seo/document`; JSON-LD в SSR-HTML |
| API | Laravel `/api/v1` (контракт: `server-shop/docs/STOREFRONT-API.md`) |
| Деплой | Docker: node:20-alpine standalone → сеть `shop` за Caddy (:80) |

## Отличия от sp-next (дельта sale-скина)

- Роут `/proposal` (запрос коммерческого предложения) — `app/proposal/page.tsx`
- `/configurator` и `/konfigurator` → 308 на категорию `/catalog/konfigurator`
  (в SPA это был `<Navigate>`; см. `lib/nav.ts`)
- Roboto Condensed вместо Inter Variable (16 woff2 в `public/fonts/`,
  генерация — `scripts/setup-fonts.sh`)
- Фолбэк-тайтлы включают proposal и полный набор sale-ui
- favicon PNG + apple-touch-icon + manifest.webmanifest (см. app/layout.tsx)

## Запуск (dev)

```bash
npm install
cp .env.example .env   # указать NEXT_PUBLIC_API_BASE_URL бэкенда
npm run dev            # http://localhost:3300
```

Проверки: `npm run typecheck` (tsc --noEmit).

## Продуктовый запуск / CI/CD

Идентично `server-shop-sp-next` (workflows CI/Images/Deploy; GHCR
`server-shop-sale-next`; совместный деплой с server-shop через
`FRONTEND_GIT_URL`). Подробности — README sp-next и
`server-shop/docs/STOREFRONTS.md`.

Healthcheck: `GET /api/healthz`. Контейнер слушает :80 (`CONTAINER_PORT`).
