/**
 * Отзывы клиентов — сканы писем/благодарностей с печатями,
 * перенесены из проекта sale (/otzivi/*.jpg, *.pdf).
 */

export type ReviewScan = {
  /** Slug исходного файла */
  id: string;
  /** Подпись карточки */
  company: string;
  image: string;
  pdf: string;
};

const scan = (id: string, company: string): ReviewScan => ({
  id,
  company,
  image: `/otzivi/${id}.jpg`,
  pdf: `/otzivi/${id}.pdf`,
});

export const reviewScans: ReviewScan[] = [
  scan("albion", "Альбион"),
  scan("auto_aliance", "Авто Альянс"),
  scan("hotel_salut", "Отель «Салют»"),
  scan("ingenius", "Ingenius"),
  scan("navikon", "Навикон"),
  scan("prima-ug-service", "ПРИМА-УГ-Сервис"),
  scan("progress", "Прогресс"),
  scan("ruform", "RuForm"),
  scan("security", "Security"),
  scan("servtech", "ServTech"),
  scan("souz_bank", "Союз Банк"),
];
