function channel(hex: string, start: number): number {
  const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function normalize(hex: string): string {
  const raw = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    throw new Error(`Contrast needs an opaque #rrggbb color, got ${hex}`);
  }
  return raw;
}

/** WCAG 2.x relative luminance of an opaque #rrggbb color. */
export function luminance(hex: string): number {
  const raw = normalize(hex);
  return 0.2126 * channel(raw, 0) + 0.7152 * channel(raw, 2) + 0.0722 * channel(raw, 4);
}

/** WCAG 2.x contrast ratio between two opaque colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** Mixes `pct` percent of `a` into `b` in sRGB, matching CSS color-mix(in srgb, a pct%, b). */
export function mix(a: string, b: string, pct: number): string {
  const x = normalize(a);
  const y = normalize(b);
  const out = [0, 2, 4].map((i) => {
    const va = Number.parseInt(x.slice(i, i + 2), 16);
    const vb = Number.parseInt(y.slice(i, i + 2), 16);
    return Math.round((va * pct + vb * (100 - pct)) / 100)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${out.join("")}`;
}
