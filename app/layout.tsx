import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { fetchSiteServer, formatPageTitleServer } from "@/lib/seo-server";
import { fetchChromeContactsServer, fetchMenuColumnsServer } from "@/lib/chrome-server";
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
  // og:image обязателен (аудит 2026-11-20: social-og-image). В CMS og_image_url
  // и logo_url могут быть пусты — берём брендовый ассет самого скина.
  const DEFAULT_OG = "/header_logo.svg";
  const rawImage = site?.ogImageUrl || site?.logoUrl || null;
  const image = rawImage
    ? (rawImage.startsWith("http") ? rawImage : `${appUrl}${rawImage}`)
    : appUrl
      ? `${appUrl}${DEFAULT_OG}`
      : "";
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
            ...(image ? { images: [{ url: image, alt: brand || undefined }] } : {}),
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Контакты и колонки подвала тянем на сервере: иначе телефон, email и адрес
  // появляются только после гидрации, и в первом HTML их нет (E-E-A-T, NAP).
  const [contacts, footerColumns] = await Promise.all([
    fetchChromeContactsServer(),
    fetchMenuColumnsServer("footer"),
  ]);

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
        {/* Self-hosted Roboto (строгий гротеск нормальной ширины; скин
            переехал с Roboto Condensed — слишком вытянутый): preload
            критичных подмножеств (кириллица 400/700 — самые частые веса),
            font-display: optional зашит в CSS (как в vite-плагине inlineCss). */}
        <link
          rel="preload"
          href="/fonts/roboto-cyrillic-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/roboto-cyrillic-700-normal.woff2"
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
        {/* GEO: явная ссылка на llms.txt (geo-llms-txt). */}
        <link rel="llms" href="/llms.txt" type="text/plain" />
      </head>
      <body>
        {/* SSR отдаёт готовый HTML — loading-скелет #root:empty из index.html
            больше не нужен. noscript-фолбэк сохранён дословно.
            app/loading.tsx намеренно отсутствует: route-level Suspense
            отправлял оболочку с HTTP 200 до готовности страницы — контент
            уезжал в <div hidden> (thin content), а notFound() превращался в
            soft-404. Без него страница рендерится целиком в первом ответе. */}
        <SiteChrome contacts={contacts} footerColumns={footerColumns}>
          {children}
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