/** Local SVG placeholders — Sale Server brand (navy #062531, accent #C3202F). */
export function productImage(label: string, _hue = 255): string {
  const raw = label.trim() || "Sale Server";
  const clipped = raw.length > 42 ? `${raw.slice(0, 40).trimEnd()}…` : raw;
  const safe = clipped
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#04141a"/>
      <stop offset="52%" stop-color="#062531"/>
      <stop offset="100%" stop-color="#0a3848"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect x="0" y="0" width="8" height="600" fill="#C3202F"/>
  <rect x="0" y="592" width="800" height="8" fill="#C3202F"/>
  <g transform="translate(400 248)" opacity="0.95">
    <polygon points="0,-72 80,-30 0,12 -80,-30" fill="#1a5a6e"/>
    <polygon points="-80,-30 0,12 0,86 -80,44" fill="#04141a"/>
    <polygon points="0,12 80,-30 80,44 0,86" fill="#C3202F"/>
  </g>
  <text x="400" y="402" fill="#ffffff" font-family="Roboto Condensed, Arial Narrow, system-ui, sans-serif" font-size="26" font-weight="700" text-anchor="middle">${safe}</text>
  <text x="400" y="438" fill="#e63a48" font-family="Roboto Condensed, Arial Narrow, system-ui, sans-serif" font-size="13" font-weight="600" letter-spacing="3.2" text-anchor="middle">SALE SERVER</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
