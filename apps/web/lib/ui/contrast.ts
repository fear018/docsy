/**
 * WCAG contrast for the palette in globals.css.
 *
 * Kept in code rather than checked by eye once: a palette drifts, and muted
 * text against a surface is exactly the pair that quietly falls below the line
 * when someone nudges a lightness value.
 */

function gamma(x: number): number {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

/** oklch (L in 0..1) to sRGB, clamped to the gamut. */
export function oklchToRgb(
  lightness: number,
  chroma: number,
  hueDeg: number,
): [number, number, number] {
  const hue = (hueDeg * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ].map((value) => Math.min(1, Math.max(0, value))) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Mirrors the @theme blocks in app/globals.css. */
export const PALETTE = {
  light: {
    bg: oklchToRgb(1, 0, 0),
    fg: oklchToRgb(0.21, 0.01, 260),
    muted: oklchToRgb(0.52, 0.015, 260),
    surface: oklchToRgb(0.975, 0.003, 260),
    brand: oklchToRgb(0.55, 0.17, 258),
    brandFg: oklchToRgb(1, 0, 0),
  },
  dark: {
    bg: oklchToRgb(0.17, 0.008, 260),
    fg: oklchToRgb(0.93, 0.005, 260),
    muted: oklchToRgb(0.68, 0.012, 260),
    surface: oklchToRgb(0.21, 0.009, 260),
    brand: oklchToRgb(0.7, 0.14, 258),
    brandFg: oklchToRgb(0.17, 0.008, 260),
  },
} as const;
