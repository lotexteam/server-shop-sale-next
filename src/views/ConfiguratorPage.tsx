"use client";

/**
 * /configurator — редирект на категорию конфигуратора (lib/nav.ts).
 * Основной путь обрабатывается app/configurator/page.tsx (HTTP redirect);
 * этот view оставлен для прямых клиентских импортов.
 */
import { CONFIGURATOR_HREF } from "@/lib/nav";

export function ConfiguratorPage() {
  return (
    <a href={CONFIGURATOR_HREF} className="sr-only">
      Перейти в конфигуратор
    </a>
  );
}
