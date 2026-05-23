export const APP_ICON_BRAND = '#063C25'

/** SVG urna + sfondo arrotondato — stessa proporzione per ogni taglia. */
export function buildAppIconSvg(size: number): string {
  const r = Math.round(size * 0.18)
  const scale = (size * 0.52) / 24
  const cx = size / 2
  const stroke = Math.max(2, size * 0.065)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${APP_ICON_BRAND}"/>
  <g transform="translate(${cx} ${cx}) scale(${scale}) translate(-12 -12)" fill="none" stroke="#ffffff" stroke-width="${stroke / scale}" stroke-linecap="round" stroke-linejoin="round">
    <path d="m9 12 2 2 4-4"/>
    <path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"/>
    <path d="M22 19H2"/>
  </g>
</svg>`
}
