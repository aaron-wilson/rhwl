/** Spacing scale in px. Keys become utilities such as p-4 and gap-2. */
export const space = {
  "0": 0,
  px: 1,
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "8": 32,
  "10": 40,
  "12": 48,
  "14": 56,
  "16": 64,
  "20": 80,
  "24": 96,
  // Layout widths: skeleton blocks, the device screen, the sidebar.
  "40": 160,
  "48": 192,
  "64": 256,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

/** Type scale modeled on Apple's text styles; tracking tightens as size grows. */
export const text = {
  caption: { size: 12, line: 16, tracking: 0 },
  footnote: { size: 13, line: 18, tracking: 0 },
  body: { size: 15, line: 22, tracking: -0.005 },
  headline: { size: 17, line: 24, tracking: -0.01 },
  title3: { size: 20, line: 26, tracking: -0.012 },
  title2: { size: 24, line: 30, tracking: -0.016 },
  title1: { size: 32, line: 38, tracking: -0.02 },
  large: { size: 44, line: 50, tracking: -0.025 },
  display: { size: 56, line: 60, tracking: -0.03 },
} as const;

export const weight = {
  regular: 400,
  semibold: 600,
  bold: 700,
} as const;

export const font = {
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace',
} as const;

/** Durations in ms. State changes live in 150-250; draw is for the one-time chart reveal. */
export const duration = {
  fast: 150,
  base: 200,
  slow: 250,
  draw: 600,
} as const;

export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  spring: "cubic-bezier(0.34, 1.36, 0.64, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

/** Large, soft, near-transparent shadows. Dark mode leans on borders instead. */
export const shadow = {
  sm: {
    light: "0 1px 2px rgb(22 21 20 / 0.04), 0 2px 8px rgb(22 21 20 / 0.04)",
    dark: "0 1px 2px rgb(0 0 0 / 0.3)",
  },
  md: {
    light: "0 2px 6px rgb(22 21 20 / 0.04), 0 12px 32px rgb(22 21 20 / 0.08)",
    dark: "0 2px 6px rgb(0 0 0 / 0.35), 0 12px 32px rgb(0 0 0 / 0.35)",
  },
  lg: {
    light: "0 4px 12px rgb(22 21 20 / 0.05), 0 24px 64px rgb(22 21 20 / 0.12)",
    dark: "0 4px 12px rgb(0 0 0 / 0.4), 0 24px 64px rgb(0 0 0 / 0.5)",
  },
} as const;

/** Backdrop blur, budgeted to three surfaces: tab bar, sheet scrim, pending island. */
export const blur = {
  chrome: 20,
} as const;

export const breakpoint = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/** The phone the presenter's phone-frame view shows: a common 6.1-inch screen, in CSS px. */
export const device = {
  width: 390,
  height: 844,
} as const;

/** Content widths. */
export const container = {
  phone: 430,
  sheet: 520,
  content: 720,
  wide: 1200,
} as const;

/** Stacking order, lowest to highest. */
export const layer = {
  base: 0,
  sticky: 10,
  nav: 20,
  scrim: 30,
  sheet: 40,
  island: 50,
  toast: 60,
} as const;

/** Icon sizes in px. Rows and inline icons use md; the phone tab bar uses lg. */
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

/** One stroke weight for every line icon, so icons read as one family. */
export const iconStroke = 1.75;
