"use client";

import Link from "next/link";
import { useHomeContent } from "@/hooks/useHomeContent";
import type { HomeTile } from "@/lib/api";

/**
 * Плитки главной — концепция старого сайта (section-tile):
 * белые карточки 325px, фото 185px сверху, uppercase-название с подчёркиванием
 * 40% ширины, описание 14px; 3 колонки, крупные плитки занимают 2.
 * Данные — из CMS (блок tiles в cms.home); нет плиток → секция скрыта.
 */

function TileCard({ tile }: { tile: HomeTile }) {
  const inner = (
    <>
      {/* Фото 185px сверху, название с подчёркиванием, описание — как в .section-tile */}
      <div
        className="absolute inset-x-0 top-0 h-[185px] bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
        style={{ backgroundImage: `url(${tile.image})` }}
        aria-hidden
      />
      <span className="absolute inset-x-0 top-[190px] px-4 text-[20px] font-bold uppercase leading-[35px] text-[#062531] after:absolute after:left-4 after:top-full after:h-px after:w-[40%] after:bg-[#062531]">
        {tile.title}
      </span>
      <span className="absolute inset-x-4 bottom-[10px] top-[235px] overflow-hidden text-[14px] leading-snug text-[rgba(6,37,49,0.9)]">
        {tile.text}
      </span>
    </>
  );

  const cls =
    "group relative block h-[325px] w-full overflow-hidden bg-white transition-shadow duration-300 hover:shadow-[0_0_15px_0_rgba(6,37,49,0.3)]";

  if (tile.creditPdf || tile.externalHref) {
    const href = tile.creditPdf ?? tile.externalHref;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={tile.title}>
        {inner}
      </a>
    );
  }

  if (tile.href) {
    return (
      <Link  href={tile.href} className={cls} aria-label={tile.title}>
        {inner}
      </Link>
    );
  }

  // Плитка без ссылки в CMS — статичная карточка
  return <div className={cls} aria-label={tile.title}>{inner}</div>;
}

export function TilesSection() {
  const { content } = useHomeContent();
  const tiles = content?.tiles ?? [];

  if (tiles.length === 0) {
    return null;
  }

  return (
    <section aria-label="Основные направления" className="bg-[rgba(245,245,245,0.92)]">
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.id} className={t.wide ? "lg:col-span-2" : undefined}>
              <TileCard tile={t} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
