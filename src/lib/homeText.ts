/**
 * Чтение плоских текстов главной по контракту docs/HOME-TEXT-CODES:
 * texts_map[code]. Отсутствующий/пустой/пробельный код — это пустой слот:
 * возвращаем fallback ('' по умолчанию) и не подставляем демо-тексты.
 */
export type HomeTextsMap = Record<string, string>;

export function homeText(map: HomeTextsMap | null | undefined, code: string, fallback = ""): string {
  if (!map || !Object.prototype.hasOwnProperty.call(map, code)) {
    return fallback;
  }
  const value = map[code];
  if (value == null) {
    return fallback;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}
