"use client";

const headerLogo = "/header_logo.svg";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Mail, MapPin } from "lucide-react";
import { useMenu } from "@/hooks/useMenu";
import type { MenuNavItem } from "@/lib/api";
import { useContacts } from "@/hooks/useContacts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useConsent } from "@/hooks/useConsent";
import { reopenConsentSettings } from "@/lib/consent/consent";
import type { ChromeContacts, ChromeMenuColumn } from "@/lib/chrome-server";

/** Абсолютный origin для share-ссылок (шеринг требует полный URL). */
const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

/**
 * Футер в концепции старого сайта: красная полоса (#bf182f), по центру ссылки,
 * ниже строка копирайта. Контент — из CMS: ссылки из меню `footer`
 * (GET /menus/footer), about и копирайт из GET /settings/contacts.
 * Пустой слот в CMS — элемент не рендерится; без CMS-меню — статический
 * фолбэк базовых ссылок.
 *
 * SEO-аудит 2026-11-20: телефон/email/адрес должны быть в первом HTML
 * (eeat-contact-page, eeat-physical-address), поэтому контакты приходят
 * серверным снимком (initialContacts) и рендерятся как <address>.
 */
export function Footer({
  initialContacts,
  initialLinks,
}: {
  initialContacts?: ChromeContacts | null;
  initialLinks?: ChromeMenuColumn[] | null;
} = {}) {
  const { items } = useMenu("footer");
  const { contacts } = useContacts();
  const { site } = useSiteSettings();
  const pathname = usePathname();
  // 152-ФЗ: «изменить настройки cookie можно в любой момент».
  const { phase } = useConsent();

  const about = contacts?.footer.about ?? initialContacts?.about ?? null;
  const copyright = contacts?.footer.copyright ?? initialContacts?.copyright ?? null;
  const brand = site?.brand?.trim() || initialContacts?.brand?.trim() || "STORE-SERVER";

  const phones = (
    contacts?.phones?.length
      ? contacts.phones
      : contacts?.phone
        ? [contacts.phone]
        : initialContacts?.phones?.length
          ? initialContacts.phones
          : initialContacts?.phone
            ? [initialContacts.phone]
            : []
  ).map((p) => ({ label: p, href: `tel:${p.replace(/\D+/g, "")}` }));
  const email = contacts?.email?.trim() || initialContacts?.email?.trim() || null;
  const address = contacts?.address?.trim() || initialContacts?.address?.trim() || null;

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
      : initialLinks && initialLinks.length > 0
        ? initialLinks.flatMap((column) =>
            column.links.length > 0
              ? column.links.map((link) => ({ id: link.id, label: link.label, href: link.href }))
              : [{ id: column.id, label: column.label, href: column.href }],
          )
        : [
            { id: "footer-catalog", label: "Каталог", href: "/catalog" },
            { id: "footer-blog", label: "Блог", href: "/blog" },
            { id: "footer-contacts", label: "Контакты", href: "/contacts" },
            { id: "footer-terms", label: "Условия продажи", href: "/terms" },
          ];

  const shareUrl = `${SITE_ORIGIN}${pathname || "/"}`;
  const shareTitle = site?.title || brand;

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
      {/*
        Контакты в первом HTML: телефон/email/адрес из CMS. Ссылки — tel:/mailto:,
        адрес — <address> (semantic + E-E-A-T).
      */}
      {(phones.length > 0 || email || address) && (
        <address className="footer-contacts border-t border-[rgba(0,0,0,0.15)] py-2 text-center text-caption not-italic text-white/85">
          {phones.map((p) => (
            <a
              key={p.href}
              href={p.href}
              className="mx-2 inline-flex min-h-11 items-center gap-1 underline-offset-2 hover:text-white hover:underline"
            >
              <Phone className="size-3.5" aria-hidden /> {p.label}
            </a>
          ))}
          {email && (
            <a
              href={`mailto:${email}`}
              className="mx-2 inline-flex min-h-11 items-center gap-1 underline-offset-2 hover:text-white hover:underline"
            >
              <Mail className="size-3.5" aria-hidden /> {email}
            </a>
          )}
          {address && (
            <span className="mx-2 inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {address}
            </span>
          )}
        </address>
      )}
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
        {/* Юридические ссылки и шеринг (eeat-terms-of-service, social-share-buttons) */}
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/terms" className="underline underline-offset-2 hover:text-white">
            Условия продажи
          </Link>
          <span aria-hidden>·</span>
          <Link href="/editorial-policy" className="underline underline-offset-2 hover:text-white">
            Редакционная политика
          </Link>
          <span aria-hidden>·</span>
          <a
            href={`https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-2 hover:text-white"
          >
            Поделиться
          </a>
        </p>
      </div>
    </footer>
  );
}