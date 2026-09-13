"use client";

const headerLogo = "/header_logo.svg";
import Link from "next/link";
import { useMenu } from "@/hooks/useMenu";
import type { MenuNavItem } from "@/lib/api";
import { useContacts } from "@/hooks/useContacts";
import { useConsent } from "@/hooks/useConsent";
import { reopenConsentSettings } from "@/lib/consent/consent";

/**
 * Футер в концепции старого сайта: красная полоса (#bf182f), по центру ссылки,
 * ниже строка копирайта. Контент — из CMS: ссылки из меню `footer`
 * (GET /menus/footer), about и копирайт из GET /settings/contacts.
 * Пустой слот в CMS — элемент не рендерится; без CMS-меню — статический
 * фолбэк базовых ссылок.
 */

export function Footer() {
  const { items } = useMenu("footer");
  const { contacts } = useContacts();
  // 152-ФЗ: «изменить настройки cookie можно в любой момент».
  const { phase } = useConsent();

  const about = contacts?.footer.about ?? null;
  const copyright = contacts?.footer.copyright ?? null;

  const consentLink = phase === "decided" && (
    <button
      type="button"
      onClick={reopenConsentSettings}
      className="underline underline-offset-2 transition-colors hover:text-white"
    >
      Настройки файлов cookie
    </button>
  );

  // «Право на забвение» (блок В ТЗ): страница отзыва согласия из подвала.
  const withdrawLink = (
    <Link
       href="/privacy/withdraw"
      className="underline underline-offset-2 transition-colors hover:text-white"
    >
      Отзыв согласия на обработку персональных данных
    </Link>
  );

  // Фолбэк-навигация, если CMS-меню `footer` ещё не заполнено или не загрузилось.
  const menuItems: MenuNavItem[] =
    items.length > 0
      ? items
      : [
          { id: "footer-catalog", label: "Каталог", href: "/catalog" },
          { id: "footer-blog", label: "Блог", href: "/blog" },
          { id: "footer-contacts", label: "Контакты", href: "/contacts" },
        ];

  return (
    <footer className="bg-[#bf182f] pb-20 text-white lg:pb-0">
      <div className="footer-links py-2.5 text-center">
        {menuItems.map((item, i) => (
          <span key={item.id}>
            {i > 0 && <span className="mx-2.5 opacity-60">·</span>}
            <Link
               href={item.href}
              className="text-[14px] transition-colors hover:text-[#06232c] hover:underline"
            >
              {item.label}
            </Link>
          </span>
        ))}
      </div>
      <div className="border-t border-[rgba(0,0,0,0.15)] py-2.5 text-center text-caption text-white/70">
        {about && <p className="px-4 leading-relaxed">{about}</p>}
        {copyright && <p>© {copyright} {new Date().getFullYear()}</p>}
        {(consentLink || withdrawLink) && (
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {consentLink}
            {consentLink && withdrawLink && <span aria-hidden>·</span>}
            {withdrawLink}
          </p>
        )}
      </div>
    </footer>
  );
}
