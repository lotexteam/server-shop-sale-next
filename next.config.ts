import type { NextConfig } from "next";
import path from "node:path";

/**
 * server-shop-sale-next — Next.js 16 App Router версия витрины
 * server-shop-sale-ui (sale-server.ru, скин МВГ Групп).
 * Миграция 1:1 по рецепту server-shop-sp-next (docs/MIGRATION-LOG.md).
 */
const nextConfig: NextConfig = {
  // Turbopack: корень проекта — этот каталог (иначе Next берёт каталог
  // первого найденного lockfile выше по дереву).
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ["http://127.0.0.1:3300", "http://localhost:3300"],
  // Single-domain деплой: на одном хосте с admin-ui (тоже Next.js) путь
  // /_next/* принадлежит админке (Caddyfile). Префикс выносит статику
  // витрины из-под конфликта; маршрут генерируется в Caddy
  // (server-shop scripts/lib-caddy.sh). В multi-domain не задавайте.
  ...(process.env.NEXT_ASSET_PREFIX
    ? { assetPrefix: process.env.NEXT_ASSET_PREFIX }
    : {}),
  // NEXT_ASSET_PREFIX — серверная переменная; клиенту (воркер MapLibre в
  // ContactsMapLibre) нужна публичная копия, иначе URL воркера уйдёт без
  // префикса и попадёт не в ту статику.
  env: {
    NEXT_PUBLIC_ASSET_PREFIX: process.env.NEXT_ASSET_PREFIX ?? "",
  },
  // Компактный Node-контейнер: docker copy .next/standalone + static + public.
  output: "standalone",
  images: {
    // Все изображения — обычные <img> как в SPA-версии; next/image не включаем.
    unoptimized: true,
  },
  // Легаси-редиректы, которые в SPA были <Navigate replace> — настоящие HTTP
  // 308 (SEO-семантика SeoDocumentBuilder, P0.2/P0.4).
  async redirects() {
    return [
      { source: "/cart", destination: "/checkout", permanent: true },
      // Канон как в store/sp: /konfigurator → /configurator, дальше работает
      // app/configurator/page.tsx (он редиректит на категорию конфигуратора
      // lib/nav.ts, сохраняя query — ?share=… и т.п.). Сам /configurator
      // в next.config НЕ редиректится, иначе page.tsx недостижим.
      { source: "/konfigurator", destination: "/configurator", permanent: true },
      { source: "/about", destination: "/blog/about", permanent: true },
      { source: "/faq", destination: "/blog/faq", permanent: true },
      { source: "/delivery", destination: "/blog/delivery", permanent: true },
      { source: "/warranty", destination: "/blog/warranty", permanent: true },
      { source: "/tradein", destination: "/blog/tradein", permanent: true },
      { source: "/services", destination: "/blog/services", permanent: true },
      { source: "/monitoring", destination: "/blog/monitoring", permanent: true },
    ];
  },
};

export default nextConfig;
