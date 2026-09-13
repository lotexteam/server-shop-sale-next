import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { fetchSiteServer, formatPageTitleServer } from "@/lib/seo-server";
import { MEDIA_BASE_URL } from "@/lib/api-base";
// Дизайн-токены + Tailwind: тот же файл, что был index.css в SPA.
import "@/index.css";

/**
 * Корневой layout — эквивалент index.html + RootLayout SPA-версии.
 *
 * Метаданные: базовые (фолбэк) значения генерируются из /settings/site —
 * как делали vite-плагин seoShellMeta (статические OG в shell) и
 * DocumentHead-фолбэки в SPA. Постраничные значения перекрывают их в
 * generateMetadata страниц (через /seo/document).
 */

export async function generateMetadata(): Promise<Metadata> {
  const site = await fetchSiteServer();
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const title = formatPageTitleServer(null, site) || "Магазин серверного оборудования";
  const description = site?.description || "";
  const image = site?.ogImageUrl || site?.logoUrl || (appUrl ? `${appUrl}/favicon.svg` : "");
  const brand = site?.brand || "";

  return {
    ...(site?.titleSuffix
      ? {
          title: {
            default: title,
            // template применится только к простым строковым title дочерних
            // метаданных (SeoDocument-тайтлы идут как absolute — см. seo-page.tsx).
            template: `%s — ${site.titleSuffix}`,
          },
        }
      : { title }),
    description,
    ...(appUrl
      ? {
          metadataBase: new URL(appUrl),
          alternates: { canonical: "/" },
          openGraph: {
            type: "website",
            siteName: brand || undefined,
            locale: "ru_RU",
            url: "/",
            title,
            description: description || undefined,
            ...(image ? { images: [{ url: image, width: 512, height: 512, alt: brand || undefined }] } : {}),
          },
          twitter: {
            card: image ? "summary_large_image" : "summary",
            ...(image ? { images: [image] } : {}),
          },
        }
      : {}),
    // Иконки/манифест sale-ui (см. index.html SPA): PNG-фавикон, apple-touch, manifest.
    icons: {
      icon: "/img/favicon.png",
      apple: "/img/logo192x192.png",
    },
    manifest: "/manifest.webmanifest",
    other: { "theme-color": "#062531" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const mediaOrigin = (() => {
    const base = MEDIA_BASE_URL.replace(/\/$/, "");
    if (!base) return null;
    try {
      return new URL(base).origin;
    } catch {
      return null;
    }
  })();

  return (
    <html lang="ru">
      <head>
        {/* Эквивалент mediaPreconnect-плагина Vite: preconnect/dns-prefetch
            к origin хранилища картинок, если оно задано. */}
        {mediaOrigin && (
          <>
            <link rel="preconnect" href={mediaOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={mediaOrigin} />
          </>
        )}
        {/* Self-hosted Roboto Condensed: preload критичных подмножеств
            (кириллица 400/700 — самые частые веса), font-display: optional
            зашит в CSS (как в vite-плагине inlineCss). */}
        <link
          rel="preload"
          href="/fonts/roboto-condensed-cyrillic-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/roboto-condensed-cyrillic-700-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        {/* Hero-видео постер sale-ui (/video/1.jpg, LCP). */}
        <link
          rel="preload"
          as="image"
          href="/video/1.jpg"
          imageSizes="100vw"
          fetchPriority="high"
        />
      </head>
      <body>
        {/* SSR отдаёт готовый HTML — loading-скелет #root:empty из index.html
            больше не нужен. noscript-фолбэк сохранён дословно.
            Suspense обязателен: страницы с useSearchParams (Catalog и др.)
            и статический /_not-found не могут пререндериться без boundary. */}
        <SiteChrome>
          <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
            {children}
          </Suspense>
        </SiteChrome>
        <noscript>
          <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "720px", margin: "48px auto", padding: "0 16px", color: "#062531" }}>
            <h1 style={{ fontSize: "22px", margin: "0 0 12px" }}>Новые и б/у серверы с гарантией до 5 лет</h1>
            <p style={{ margin: "0 0 16px", lineHeight: 1.5 }}>
              Серверы HP, Dell, IBM в наличии на складе. Доставка по всей территории РФ. Для работы
              витрины включите JavaScript.
            </p>
            <ul style={{ lineHeight: 2 }}>
              <li><a href="/catalog">Каталог оборудования</a></li>
              <li><a href="/blog">Блог и статьи</a></li>
              <li><a href="/contacts">Контакты</a></li>
            </ul>
          </div>
        </noscript>
      </body>
    </html>
  );
}
