import { notFound } from "next/navigation";
import { ProductPage } from "@/views/ProductPage";
import { pageSeo, JsonLd } from "@/lib/seo-page";
import { getProductServer } from "@/lib/server-data";
import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      v === undefined ? [] : Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v] as [string, string]],
    ),
  );
  // redirect_to is NOT handled here: redirect from generateMetadata
  // is unsupported in Next 16 (crashes Server Components render).
  const { metadata } = await pageSeo(`/product/${slug}${qs.size ? `?${qs}` : ""}`, `/product/${slug}`);
  return metadata;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const { jsonld, redirectTo, notFound: isMissing } = await pageSeo(`/product/${slug}`, `/product/${slug}`);
  // Legacy 301 (P0.2/P0.4): slug renames etc - from the page body.
  if (redirectTo) permanentRedirect(redirectTo);
  // P0.2: факт отсутствия из /seo/document → настоящий 404.
  // Сбой API (doc === null) сюда не попадает: страница не 404-ит массово.
  if (isMissing) notFound();
  // P0.1: SSR товара тем же endpoint'ом /products/{slug} и тем же маппингом,
  // что у клиентского fetchProduct.
  // decodeURIComponent — та же нормализация ключа, что в клиенте.
  let key = String(slug || "").trim();
  try {
    key = decodeURIComponent(key);
  } catch {
    /* already decoded */
  }
  const initialProduct = await getProductServer(key);
  return (
    <>
      <JsonLd blocks={jsonld} />
      <ProductPage initialProduct={initialProduct} />
    </>
  );
}
