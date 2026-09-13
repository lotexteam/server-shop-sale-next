"use client";

import { getIcon } from "@/lib/icons";
import { useHomeContent } from "@/hooks/useHomeContent";

/**
 * «Почему мы» — концепция старого сайта (section-benefits): прозрачная секция
 * поверх видео-фона. Слева — заголовок (выровнен по центру по высоте),
 * справа — иконки: крупные (110px), отцентрованы в своих колонках.
 * Тексты — из CMS (sections.benefits.title + блок benefits в cms.home);
 * нет заголовка и пунктов → секция скрыта.
 */

export function BenefitsSection() {
  const { content } = useHomeContent();
  const title = content?.benefits.title ?? null;
  const items = content?.benefits.items ?? [];

  if (!title && items.length === 0) {
    return null;
  }

  return (
    <section aria-label={title ?? "Почему мы"} className="my-8 px-4 text-white">
      <div className="mx-auto flex max-w-[1300px] flex-col gap-8 lg:flex-row lg:items-center">
        {title && (
          <h2 className="shrink-0 text-left text-[2.369em] font-bold uppercase leading-tight">
            <AccentLastWord title={title} />
          </h2>
        )}
        {items.length > 0 && (
          <div className="grid flex-1 grid-cols-2 justify-items-center gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
            {items.map(({ icon, text }) => {
              const Icon = getIcon(icon);
              return (
                <div key={text} className="flex max-w-[230px] flex-col items-center justify-center text-center">
                  <Icon
                    className="size-[110px] text-[#e63a48] drop-shadow-[0_1px_10px_rgba(4,20,26,0.55)]"
                    strokeWidth={1.25}
                    aria-hidden
                  />
                  <p className="mt-4 text-body-sm leading-relaxed text-white [text-shadow:0_1px_10px_rgba(4,20,26,0.55)]">
                    {text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/** Заголовок с красным акцентом на последнем слове (как в оригинале: «Почему мы») */
function AccentLastWord({ title }: { title: string }) {
  const parts = title.trim().split(/\s+/);
  if (parts.length < 2) {
    return <>{title}</>;
  }
  const last = parts[parts.length - 1];
  const head = parts.slice(0, -1).join(" ");

  return (
    <>
      {head} <span className="text-[#e63a48]">{last}</span>
    </>
  );
}
