/** A color role with one value per theme. Hex only, so contrast can be measured. */
export interface ThemedColor {
  readonly light: string;
  readonly dark: string;
  readonly note: string;
}

/** Semantic color roles. Feature code uses these names, never raw values. */
export const color = {
  canvas: { light: "#F7F6F3", dark: "#0B0B0A", note: "Page background" },
  surface: { light: "#FFFFFF", dark: "#171615", note: "Cards, sheets, rows" },
  "surface-2": { light: "#EFEDE9", dark: "#22211F", note: "Grouped and sunken areas, inputs" },
  line: { light: "#E4E1DC", dark: "#2C2B29", note: "Hairline borders" },
  "line-strong": {
    light: "#CBC7C0",
    dark: "#45433F",
    note: "Emphasized borders, dividers in dense lists",
  },
  ink: { light: "#161514", dark: "#F5F4F1", note: "Primary text and numbers" },
  "ink-2": { light: "#57544F", dark: "#B3AFA8", note: "Secondary text" },
  "ink-3": { light: "#6E6A64", dark: "#8F8B84", note: "Tertiary text, captions, placeholders" },
  gain: { light: "#0A7A34", dark: "#4CE38A", note: "Up moves, gain tint" },
  "gain-soft": { light: "#E2F4E8", dark: "#12301F", note: "Gain chip and wash background" },
  "on-gain": { light: "#FFFFFF", dark: "#03160A", note: "Text on solid gain" },
  loss: { light: "#BF2E1B", dark: "#FF7A61", note: "Down moves, loss tint" },
  "loss-soft": { light: "#FBE7E3", dark: "#3A1711", note: "Loss chip and wash background" },
  "on-loss": { light: "#FFFFFF", dark: "#240702", note: "Text on solid loss" },
  live: { light: "#5B3FE0", dark: "#A898FF", note: "Pending, streaming and agent state" },
  "live-soft": { light: "#ECE8FD", dark: "#241C45", note: "Live chip background" },
  "on-live": { light: "#FFFFFF", dark: "#120B33", note: "Text on solid live" },
  warn: { light: "#8A5A00", dark: "#F2B443", note: "Caution text and icons" },
  "warn-soft": { light: "#FBF0D9", dark: "#33260B", note: "Caution banner background" },
  focus: { light: "#1B62E0", dark: "#7AAEFF", note: "Focus ring" },
  "code-plate": {
    light: "#FFFFFF",
    dark: "#F5F4F1",
    note: "Behind QR codes: stays light in both themes so scanners read it",
  },
  "code-ink": { light: "#161514", dark: "#161514", note: "QR code modules" },
  scrim: { light: "#16151466", dark: "#00000099", note: "Behind sheets and dialogs" },
  chrome: { light: "#F7F6F3CC", dark: "#0B0B0ACC", note: "Translucent bars under backdrop blur" },
} as const satisfies Record<string, ThemedColor>;

export type ColorRole = keyof typeof color;

/**
 * Content colors: token icons, sector chips, launch cards. Color comes from
 * content, never from chrome, so these never style buttons or bars.
 */
export const splash = {
  sky: { light: "#0369A1", dark: "#7CC8F2", note: "Tech, L2s" },
  violet: { light: "#6D28D9", dark: "#C4A6FF", note: "AI, compute" },
  pink: { light: "#BE185D", dark: "#F9A8D4", note: "Consumer, memes" },
  orange: { light: "#B23A09", dark: "#FDBA74", note: "Energy, autos" },
  amber: { light: "#8A5A00", dark: "#FCD34D", note: "Finance, gold" },
  teal: { light: "#0F766E", dark: "#5EEAD4", note: "Stablecoins, yield" },
  lime: { light: "#44700B", dark: "#BEF264", note: "Launches, new" },
  blue: { light: "#1D4ED8", dark: "#93B4FF", note: "Index funds, ETFs" },
} as const satisfies Record<string, ThemedColor>;

export type SplashName = keyof typeof splash;

/** Roles that follow the market tint: gain by default, loss when data-tint="loss". */
export const tintAliases = {
  accent: { gain: "gain", loss: "loss" },
  "accent-soft": { gain: "gain-soft", loss: "loss-soft" },
  "on-accent": { gain: "on-gain", loss: "on-loss" },
} as const satisfies Record<string, { gain: ColorRole; loss: ColorRole }>;

/** Foreground/background pairs that must meet a contrast minimum in both themes. */
export const contrastPairs: readonly {
  readonly fg: ColorRole;
  readonly bg: ColorRole;
  readonly min: number;
  readonly use: string;
}[] = [
  { fg: "ink", bg: "canvas", min: 4.5, use: "Body text" },
  { fg: "ink", bg: "surface-2", min: 4.5, use: "Text in inputs" },
  { fg: "ink-2", bg: "canvas", min: 4.5, use: "Secondary text" },
  { fg: "ink-3", bg: "canvas", min: 4.5, use: "Section labels on the page" },
  { fg: "ink-2", bg: "surface", min: 4.5, use: "Secondary text on cards" },
  { fg: "ink-3", bg: "surface", min: 4.5, use: "Captions on cards" },
  { fg: "ink-3", bg: "surface-2", min: 4.5, use: "Placeholders" },
  { fg: "gain", bg: "surface", min: 4.5, use: "Gain numbers" },
  { fg: "gain", bg: "gain-soft", min: 4.5, use: "Gain chip" },
  { fg: "on-gain", bg: "gain", min: 4.5, use: "Primary button, gain tint" },
  { fg: "loss", bg: "surface", min: 4.5, use: "Loss numbers" },
  { fg: "loss", bg: "loss-soft", min: 4.5, use: "Loss chip" },
  { fg: "on-loss", bg: "loss", min: 4.5, use: "Primary button, loss tint" },
  { fg: "live", bg: "surface", min: 4.5, use: "Live labels" },
  { fg: "live", bg: "live-soft", min: 4.5, use: "Live chip" },
  { fg: "on-live", bg: "live", min: 4.5, use: "Agent button" },
  { fg: "warn", bg: "warn-soft", min: 4.5, use: "Caution banner" },
  { fg: "focus", bg: "canvas", min: 3, use: "Focus ring" },
  { fg: "code-ink", bg: "code-plate", min: 7, use: "QR code modules" },
];

/** Every splash color is used as chip text on a surface, so it must read as text. */
export const splashContrastBg: ColorRole = "surface";
export const splashContrastMin = 4.5;

/** Percent of a splash color mixed into the surface for its soft chip and icon background. */
export const splashSoftMix = 14;
