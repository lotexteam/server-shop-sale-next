import { CatalogPage } from "@/views/CatalogPage";
import { pageSeo, JsonLd } from "@/lib/seo-page";
import { notFound, permanentRedirect } from "next/navigation";
import { fetchProductsServer, getCategoriesServer, applyCatalogFilter } from "@/lib/server-data";

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
  const { metadata } = await pageSeo(`/catalog/${slug}${qs.size ? `?${qs}` : ""}`, `/catalog/${slug}`);
  return metadata;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const { jsonld, redirectTo, notFound: isMissing } = await pageSeo(`/catalog/${slug}`, `/catalog/${slug}`);
  // Legacy 301 (P0.2/P0.4): slug renames etc - from the page body.
  if (redirectTo) permanentRedirect(redirectTo);
  // P0.2: неизвестная категория → настоящий 404 (а не 200 с пустым каталогом).
  if (isMissing) notFound();
  // P0.1: SSR первой страницы категории теми же endpoint'ами, что у хуков.
  const [page1, categories] = await Promise.all([
    fetchProductsServer({ page: 1, per_page: 12 }),
    getCategoriesServer(),
  ]);
  return (
    <>
      <JsonLd blocks={jsonld} />
      <CatalogPage
        initialProducts={applyCatalogFilter(page1.items)}
        initialCategories={categories}
        initialTotal={page1.total}
      />
    </>
  );
}
