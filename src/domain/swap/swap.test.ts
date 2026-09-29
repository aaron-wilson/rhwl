import { describe, expect, it } from "vitest";
import { assetById } from "../../data/assets";
import { amount, parseAmount, toDecimalString, type Amount } from "../money/amount";
import { QUOTE_TTL_MS, quoteLife, quoteReducer, type QuoteState } from "./quote";
import {
  defaultSlippageBps,
  HIGH_IMPACT_BPS,
  minimumReceived,
  parseSlippage,
  quoteRoutes,
} from "./routes";

const usd = (text: string): Amount => parseAmount(text, 8) ?? amount(0n, 8);
const side = (id: string, price: string) => ({ asset: assetById(id), price: usd(price) });
const qty = (id: string, text: string) =>
  parseAmount(text, assetById(id).decimals) ?? amount(0n, 0);

describe("quoteRoutes", () => {
  it("returns three venues, best first, each with an output and impact", () => {
    const routes = quoteRoutes(
      side("rh:USDG", "1"),
      side("rh:ETH", "3200"),
      qty("rh:USDG", "1000"),
    );
    expect(routes.map((r) => r.venue.id)).toEqual(["pairwise", "split", "hood"]);
    const best = routes[0];
    // $1,000 less 0.25% is $997.50; a $27M pool returns $997.46: 0.311707 ETH.
    expect(toDecimalString(best?.out ?? amount(0n, 0)).slice(0, 8)).toBe("0.311707");
    expect(best?.impactBps).toBe(0n);
  });

  it("prefers the split route when size makes depth matter more than fees", () => {
    const routes = quoteRoutes(
      side("rh:USDG", "1"),
      side("rh:CHIPDOG", "0.002"),
      qty("rh:USDG", "50000"),
    );
    expect(routes[0]?.venue.id).toBe("split");
    // Against a $600K meme pool, $50K moves the price over 5% even when split.
    expect(routes[0]?.impactBps).toBe(541n);
    expect((routes[0]?.impactBps ?? 0n) > HIGH_IMPACT_BPS).toBe(true);
    expect(routes.at(-1)?.venue.id).toBe("pairwise");
  });

  it("returns nothing for nothing", () => {
    const routes = quoteRoutes(side("rh:USDG", "1"), side("rh:ETH", "3200"), qty("rh:USDG", "0"));
    expect(routes.every((r) => r.out.base === 0n && r.impactBps === 0n)).toBe(true);
  });
});

describe("slippage", () => {
  it.each([
    ["rh:USDG", "rh:USDC", 10],
    ["rh:USDG", "rh:ETH", 50],
    ["rh:NVDA", "rh:USDG", 50],
    ["rh:ETH", "rh:CHIPDOG", 300],
  ])("%s → %s defaults to %d bps", (from, to, bps) => {
    expect(defaultSlippageBps(assetById(from), assetById(to))).toBe(bps);
  });

  it("gives the minimum received, rounded down", () => {
    expect(minimumReceived(amount(1_000_001n, 6), 50).base).toBe(995_000n);
  });

  it.each([
    ["0.5", 50],
    ["1%", 100],
    ["0.05", 5],
    ["50", 5_000],
    ["0", undefined],
    ["51", undefined],
    ["0.001", undefined],
    ["abc", undefined],
  ])("custom %j → %s bps", (text, bps) => {
    expect(parseSlippage(text)).toBe(bps);
  });
});

describe("quoteReducer", () => {
  const at = new Date("2026-09-29T16:00:00Z");
  const routes = quoteRoutes(side("rh:USDG", "1"), side("rh:ETH", "3200"), qty("rh:USDG", "10"));
  const fresh: QuoteState = { status: "fresh", routes, quotedAt: at };

  it("goes idle → quoting → fresh → stale → quoting", () => {
    let state: QuoteState = { status: "idle" };
    state = quoteReducer(state, { type: "request" });
    expect(state.status).toBe("quoting");
    state = quoteReducer(state, { type: "receive", routes, at });
    expect(state).toEqual(fresh);
    state = quoteReducer(state, { type: "expire" });
    expect(state.status).toBe("stale");
    expect(quoteReducer(state, { type: "request" }).status).toBe("quoting");
  });

  it("ignores an answer to a request that was superseded or cleared", () => {
    expect(quoteReducer({ status: "idle" }, { type: "receive", routes, at })).toEqual({
      status: "idle",
    });
  });

  it("only expires a fresh quote", () => {
    expect(quoteReducer({ status: "quoting" }, { type: "expire" })).toEqual({
      status: "quoting",
    });
  });

  it("clears to idle", () => {
    expect(quoteReducer(fresh, { type: "clear" })).toEqual({ status: "idle" });
  });

  it("reports the share of the quote's life left for the ring", () => {
    expect(quoteLife(at, at)).toBe(1);
    expect(quoteLife(at, new Date(at.getTime() + QUOTE_TTL_MS / 2))).toBe(0.5);
    expect(quoteLife(at, new Date(at.getTime() + QUOTE_TTL_MS * 2))).toBe(0);
  });
});
