import { describe, expect, it } from "vitest";
import { amount } from "../money/amount";
import { csvField, lotsCsv } from "./csv";
import { fifoLots, openCostCents, realizedCents } from "./lots";

const units = (n: bigint) => amount(n * 100n, 2);
const d = (day: number) => new Date(Date.UTC(2026, 8, day));
// $100 until the 10th, $150 until the 20th, then $120.
const priceAt = (at: Date) => amount((at < d(10) ? 100n : at < d(20) ? 150n : 120n) * 10n ** 8n, 8);

describe("fifoLots", () => {
  it("sells the oldest lot first, splitting a sale across two lots", () => {
    // Buy 2 @ $100 (1st), buy 3 @ $150 (12th), sell 4 @ $120 (25th).
    const book = fifoLots(
      [
        { at: d(1), quantity: units(2n) },
        { at: d(12), quantity: units(3n) },
        { at: d(25), quantity: units(-4n) },
      ],
      priceAt,
    );
    expect(book.closed).toEqual([
      {
        acquiredAt: d(1),
        soldAt: d(25),
        quantity: units(2n),
        costCents: 20_000n,
        proceedsCents: 24_000n,
      },
      {
        acquiredAt: d(12),
        soldAt: d(25),
        quantity: units(2n),
        costCents: 30_000n,
        proceedsCents: 24_000n,
      },
    ]);
    expect(book.open).toEqual([{ acquiredAt: d(12), quantity: units(1n), costCents: 15_000n }]);
    // Lot 1: +$40.00. Lot 2: −$60.00. Realized −$20.00.
    expect(realizedCents(book)).toBe(-2_000n);
    expect(openCostCents(book)).toBe(15_000n);
  });

  it("keeps every lot open with no sales", () => {
    const book = fifoLots([{ at: d(1), quantity: units(2n) }], priceAt);
    expect(book).toEqual({
      open: [{ acquiredAt: d(1), quantity: units(2n), costCents: 20_000n }],
      closed: [],
    });
  });

  it("never sells more than the lots hold", () => {
    const book = fifoLots(
      [
        { at: d(1), quantity: units(1n) },
        { at: d(25), quantity: units(-3n) },
      ],
      priceAt,
    );
    expect(book.closed).toHaveLength(1);
    expect(book.closed[0]?.quantity).toEqual(units(1n));
    expect(book.open).toEqual([]);
  });
});

describe("lotsCsv", () => {
  it("writes fixed columns, exact decimals and CRLF line ends", () => {
    const book = fifoLots(
      [
        { at: d(1), quantity: units(2n) },
        { at: d(12), quantity: units(3n) },
        { at: d(25), quantity: units(-4n) },
      ],
      priceAt,
    );
    expect(lotsCsv([{ symbol: "NVDA", book }])).toBe(
      [
        "asset,acquired,quantity,cost_usd,sold,proceeds_usd,gain_usd,status",
        "NVDA,2026-09-01,2,200.00,2026-09-25,240.00,40.00,closed",
        "NVDA,2026-09-12,2,300.00,2026-09-25,240.00,-60.00,closed",
        "NVDA,2026-09-12,1,150.00,,,,open",
        "",
      ].join("\r\n"),
    );
  });

  it.each([
    ["plain", "plain"],
    ["a,b", '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ["two\nlines", '"two\nlines"'],
  ])("quotes %j as %s", (value, field) => {
    expect(csvField(value)).toBe(field);
  });
});
