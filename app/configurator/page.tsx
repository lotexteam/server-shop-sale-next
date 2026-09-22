import { permanentRedirect } from "next/navigation";

/**
 * /configurator — каноническая страница входа в конфигуратор (как в store/sp;
 * /konfigurator редиректится сюда из next.config.ts). Сама страница редиректит
 * на категорию конфигуратора (lib/nav.ts: CONFIGURATOR_SLUG), пробрасывая
 * query (?share=… и т.п.) — в SPA это был <Navigate>.
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
