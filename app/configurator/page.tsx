import { permanentRedirect } from "next/navigation";

/**
 * /configurator — редирект на категорию конфигуратора (lib/nav.ts:
 * CONFIGURATOR_HREF = /catalog/konfigurator). В SPA это был <Navigate>;
 * путь /konfigurator также редиректится в next.config.ts. Эта страница
 * покрывает прямые заходы с query (?share=… и т.п.), передавая их дальше.
 */

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      v === undefined ? [] : Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v] as [string, string]],
    ),
  );
  const target = qs.size ? `/catalog/konfigurator?${qs}` : "/catalog/konfigurator";
  permanentRedirect(target);
}
