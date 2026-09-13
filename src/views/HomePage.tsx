"use client";

import { Fragment } from "react";
import Link from "next/link";
import { HeroVideoStage } from "@/components/home/HeroVideoStage";
import { TilesSection } from "@/components/home/TilesSection";
import { BenefitsSection } from "@/components/home/BenefitsSection";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/common/Section";
import { useHomeHighlights } from "@/hooks/useCatalogProducts";
import { useHomeContent } from "@/hooks/useHomeContent";

/**
 * Главная в концепции старого сайта sale-server:
 * видео-фон → центрированный hero → плитки (полупрозрачный светлый фон)
 * → «Почему мы» поверх видео → «Скидки и акции» на #f5f5f5.
 * Тексты — из CMS (GET /settings/home, сидер sale-server): пустой слот
 * в cms.home означает, что элемент не рендерится, фолбэков нет.
 */

/** Заголовок секции с красным акцентом на последнем слове */
function AccentTitle({ title }: { title: string }) {
  const parts = title.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : null;
  const head = last ? parts.slice(0, -1).join(" ") : null;

  return (
    <>
      {head && <span>{head} </span>}
      {last ? <span className="text-[#bf182f]">{last}</span> : title}
    </>
  );
}

export function HomePage() {
  const { products, loading } = useHomeHighlights();
  const { content: home } = useHomeContent();
  const latest = products.slice(0, 8);

  const heroTitle = home?.heroTitle ?? null;
  const heroLinks = home?.heroLinks ?? [];
  const heroLead = home?.heroLead ?? null;
  const heroNotice = home?.heroNotice ?? null;
  const heroReviewsLabel = home?.heroReviewsLabel ?? null;
  const heroReviewsLinks = home?.heroReviewsLinks ?? [];
  const heroRatingWidgetUrl = home?.heroRatingWidgetUrl ?? null;
  const discountsTitle = home?.discounts.title ?? null;
  const discountsEmpty = home?.discounts.empty ?? null;
  const showHeroReviews = Boolean(heroReviewsLabel) || heroReviewsLinks.length > 0;

  return (
    <>
      {/* Видео-фон: hero + плитки + «Почему мы» поверх него (видео начинается под шапкой) */}
      <div className="relative">
        <HeroVideoStage />

        <div className="hero-pull relative z-10">
          {/* HERO — по левому краю, фирменные цвета */}
          <section
            className="hero-fit relative flex flex-col justify-center overflow-hidden"
            aria-label="Главный баннер"
          >
            <div className="container-page relative mx-auto w-full max-w-[1300px] px-4 [text-shadow:0_1px_14px_rgba(4,20,26,0.6)]">
              <div className="max-w-2xl">
                {/* Гарантированный h1 на странице: пустой CMS-слот → дефолтный текст */}
                <h1 className="hero-fit-title font-bold uppercase text-white">
                  {heroTitle ?? "Новые и б/у серверы с гарантией до 5 лет"}
                </h1>
                {/* Фирменная линия-акцент под заголовком (как подчёркивание плиток) */}
                <div className="hero-line mt-4 h-[3px] w-20 bg-[#e63a48]" aria-hidden />
                {heroLinks.length > 0 && (
                  <p className="hero-fit-stat mt-6 font-light text-white">
                    {heroLinks.map((seg, i) => (
                      <Fragment key={`${seg.label}-${i}`}>
                        {i > 0 && " "}
                        {seg.href ? (
                          <Link
                             href={seg.href}
                            className="text-[#e63a48] transition-colors hover:text-white"
                          >
                            {seg.label}
                          </Link>
                        ) : (
                          <span className="text-white">{seg.label}</span>
                        )}
                      </Fragment>
                    ))}
                  </p>
                )}
                {heroLead && <p className="hero-fit-lead mt-5 text-white/90">{heroLead}</p>}
                {heroNotice && (
                  <p className="hero-fit-lead font-semibold uppercase tracking-wide text-white/95">
                    {heroNotice}
                  </p>
                )}
                {showHeroReviews && (
                  <div className="hero-fit-lead mt-6 flex flex-wrap items-center gap-2 text-white/80">
                    {heroReviewsLabel && (
                      <span className="font-semibold uppercase tracking-widest">
                        {heroReviewsLabel}
                      </span>
                    )}
                    {heroReviewsLinks.map((link, i) => (
                      <Fragment key={link.url}>
                        {i > 0 && <span className="text-white/40">/</span>}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-white transition-colors hover:text-[#e63a48]"
                        >
                          {link.label}
                        </a>
                      </Fragment>
                    ))}
                  </div>
                )}
                {heroRatingWidgetUrl && (
                  <div className="hero-extra mt-4 hidden sm:flex">
                    <iframe
                      src={heroRatingWidgetUrl}
                      title={heroReviewsLabel || "Рейтинг"}
                      width={150}
                      height={50}
                      frameBorder={0}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Плитки направлений */}
          <TilesSection />

          {/* Почему мы — поверх видео, как в оригинале */}
          <BenefitsSection />
        </div>
      </div>

      {/* Скидки и акции */}
      <section className="bg-[#f5f5f5] px-4 py-10 lg:py-14">
        <div className="mx-auto max-w-[1400px]">
          {discountsTitle && (
            <h2 className="text-center text-[2.369em] font-bold uppercase leading-tight text-[#062531]">
              <AccentTitle title={discountsTitle} />
            </h2>
          )}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={`sa-${i}`} />)
              : latest.length === 0
                ? discountsEmpty && (
                    <p className="col-span-full py-8 text-center text-body text-[#062531]/70">
                      {discountsEmpty}
                    </p>
                  )
                : latest.map((p, i) => (
                    <Reveal key={p.id} delay={i * 0.05}>
                      <ProductCard product={p} />
                    </Reveal>
                  ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-none border border-[rgba(6,37,49,0.2)] bg-white shadow-card" aria-hidden>
      <div className="aspect-[16/10] animate-pulse bg-secondary" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  );
}
