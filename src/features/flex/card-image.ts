import type { FlexCard } from "../../domain/flex/card";
import { formatFiat, formatPercentBps, formatPrice } from "../../domain/money/format";

/** The card's text as drawn on the image, top to bottom. */
export function cardLines(card: FlexCard): {
  readonly title: string;
  readonly pnl: string;
  readonly details: readonly string[];
  readonly footer: string;
} {
  return {
    title: `${card.symbol} · ${card.accountName}`,
    pnl: formatPercentBps(card.pnlBps),
    details: [
      `P&L ${card.pnlCents === undefined ? "not shown" : formatFiat(card.pnlCents, "always")}`,
      `Entry ${formatPrice(card.entry)} → Mark ${formatPrice(card.mark)}`,
    ],
    footer: `Signed by the wallet · ${card.at.toISOString().slice(0, 10)} · verify at the link`,
  };
}

const WIDTH = 1080;
const HEIGHT = 1080;

/**
 * Draws the card as a square PNG in the current theme and tint, reading every
 * color and the font from the design tokens on the root element.
 */
export function renderCardPng(card: FlexCard): Promise<Blob> {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(`--rh-${name}`).trim();
  const up = card.pnlBps >= 0n;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return Promise.reject(new Error("Canvas is unavailable"));
  const font = token("font-sans");
  const lines = cardLines(card);

  ctx.fillStyle = token(up ? "color-gain-soft" : "color-loss-soft");
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = token("color-ink");
  ctx.font = `600 56px ${font}`;
  ctx.fillText(lines.title, 96, 180);
  ctx.fillStyle = token(up ? "color-gain" : "color-loss");
  ctx.font = `700 200px ${font}`;
  ctx.fillText(lines.pnl, 88, 520);
  ctx.fillStyle = token("color-ink-2");
  ctx.font = `500 48px ${font}`;
  lines.details.forEach((line, i) => {
    ctx.fillText(line, 96, 680 + i * 72);
  });
  ctx.fillStyle = token("color-ink-3");
  ctx.font = `400 36px ${font}`;
  ctx.fillText(lines.footer, 96, HEIGHT - 96);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error("The card could not be drawn"));
      else resolve(blob);
    }, "image/png");
  });
}
