/**
 * Контактные данные и справочники, перенесённые из проекта sale.
 * Используются как fallback до загрузки CMS (settings/contacts).
 */

export const SALE_CONTACTS = {
  phones: ["+7 (495) 260-88-68", "+7 (495) 227-78-68", "+7 (916) 439-00-89"],
  email: "info@sale-server.ru",
  monitoringEmail: "monitoring@sale-server.ru",
  address: "127495, г. Москва, ул. Бульвар Академика Ландау, д. 5, к. 2, помещение 10/1",
  workDays: "Пн–Пт",
  workHours: "10:00–18:00",
  viber: "viber://chat?number=79164390089",
  whatsapp: "https://api.whatsapp.com/send?phone=79164390089",
} as const;

export type ServiceItem = {
  slug: string;
  title: string;
  desc: string;
};

/** IT-услуги (в sale — справочник из БД; здесь статичный каталог без цен). */
export const SERVICES: ServiceItem[] = [
  { slug: "diagnostika", title: "Диагностика оборудования", desc: "Полная аппаратная диагностика серверов, СХД и комплектующих с отчётом о состоянии." },
  { slug: "remont", title: "Ремонт серверов", desc: "Компонентный ремонт платформ, замена неисправных узлов из собственного ЗИП." },
  { slug: "konfiguratsiya", title: "Сборка и конфигурация", desc: "Сборка сервера под задачу: RAID, дисковая подсистема, прошивки, БИОС/UEFI." },
  { slug: "modernizatsiya", title: "Модернизация и апгрейд", desc: "Расширение памяти, процессоров и дисковой подсистемы существующих серверов." },
  { slug: "montazh", title: "Монтаж в стойку", desc: "Установка и коммутация оборудования в стойке, организация кабельной системы." },
  { slug: "monitoring", title: "Настройка мониторинга", desc: "Внедрение комплексных систем мониторинга IT-инфраструктуры, интеграция с сервисами клиента." },
];
