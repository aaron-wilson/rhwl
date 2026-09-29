import { amount, toDecimalString, toPlainDecimal } from "../money/amount";
import type { LotBook } from "./lots";

export const CSV_HEADER = [
  "asset",
  "acquired",
  "quantity",
  "cost_usd",
  "sold",
  "proceeds_usd",
  "gain_usd",
  "status",
] as const;

/** One field per RFC 4180: quoted when it holds a comma, quote or line break; quotes doubled. */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

const usd = (cents: bigint) => toDecimalString(amount(cents, 2));
const day = (at: Date) => at.toISOString().slice(0, 10);

/** Every lot of every asset, closed disposals then open lots, as CSV with CRLF line ends. */
export function lotsCsv(
  books: readonly { readonly symbol: string; readonly book: LotBook }[],
): string {
  const rows: string[][] = [[...CSV_HEADER]];
  for (const { symbol, book } of books) {
    for (const d of book.closed) {
      rows.push([
        symbol,
        day(d.acquiredAt),
        toPlainDecimal(d.quantity),
        usd(d.costCents),
        day(d.soldAt),
        usd(d.proceedsCents),
        usd(d.proceedsCents - d.costCents),
        "closed",
      ]);
    }
    for (const l of book.open) {
      rows.push([
        symbol,
        day(l.acquiredAt),
        toPlainDecimal(l.quantity),
        usd(l.costCents),
        "",
        "",
        "",
        "open",
      ]);
    }
  }
  return `${rows.map((r) => r.map(csvField).join(",")).join("\r\n")}\r\n`;
}
