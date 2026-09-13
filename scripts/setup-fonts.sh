#!/usr/bin/env bash
# Шрифты sale-ui: self-hosted @font-face из @fontsource/roboto-condensed
# (кириллица+latin, веса 300/400/500/700), font-display: optional
# (эквивалент vite-плагина inlineCss). Скопировано из package css с заменой
# пути на /fonts/ и font-display swap -> optional.
set -euo pipefail
cd "$(dirname "$0")/.." || exit 1

SRC_CSS="node_modules/@fontsource/roboto-condensed"
mkdir -p public/fonts

# Копируем нужные woff2 (cyrillic/latin/cyrillic-ext/latin-ext × 4 веса)
for subset in cyrillic cyrillic-ext latin latin-ext; do
  for w in 300 400 500 700; do
    cp "$SRC_CSS/files/roboto-condensed-$subset-$w-normal.woff2" "public/fonts/" 2>/dev/null || \
      echo "WARN: no $subset-$w"
  done
done

# Генерируем @font-face блок: парсим css пакета, меняем url и font-display
gen_block() {
  local subset="$1" weight="$2"
  local css="$SRC_CSS/$weight.css"
  # берём @font-face для нужного subset: блок содержит комментарий /* subset-weight-normal */
  awk -v marker="roboto-condensed-$subset-$weight-normal" '
    BEGIN{inblock=0}
    /\/\*/ { comment=$0; if (index(comment, marker)>0) inblock=1; next }
    inblock && /^}/ { print; exit }
    inblock { print }
  ' "$css" | sed \
    -e "s#url(./files/#url(/fonts/#" \
    -e "s#font-display: swap#font-display: optional#"
}

OUT="src/index.css"
TMP="$(mktemp)"
{
  echo "/*"
  echo " * Roboto Condensed — self-hosted (кириллица+latin, 300/400/500/700),"
  echo " * font-display: optional — эквивалент vite-плагина inlineCss из SPA"
  echo " * (поздний webfont не должен рефлауить отрендеренный текст)."
  echo " * Сгенерировано scripts/setup-fonts.sh из @fontsource/roboto-condensed."
  echo " */"
  for subset in cyrillic cyrillic-ext latin latin-ext; do
    for w in 300 400 500 700; do
      gen_block "$subset" "$w"
    done
  done
} >"$TMP"

# Заменяем блок @import в начале index.css
if head -5 "$OUT" | grep -q '@fontsource/roboto-condensed'; then
  # убираем строки @import @fontsource (первые 4)
  sed '1,4{/^@import "@fontsource/d}' "$OUT" | cat "$TMP" - > "$OUT.new"
  mv "$OUT.new" "$OUT"
  echo "OK: @font-face блоки вставлены, @import удалены"
else
  echo "ERROR: @import @fontsource не найден в начале $OUT" >&2
  exit 1
fi
echo "fonts: $(ls public/fonts | wc -l) файлов"
