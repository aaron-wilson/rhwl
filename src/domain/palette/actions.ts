/** A typed instruction the palette turns into a prefilled screen. */
export interface ParsedAction {
  readonly title: string;
  readonly to: string;
}

const AMOUNT = "(\\d+(?:\\.\\d+)?)";
const SYMBOL = "([a-z]{2,10})";
const NAME = "(\\S+)";

/**
 * Reads "send 20 USDG to you.rh", "swap ETH for USDG" (or "to") and "buy NVDA".
 * `assetIdFor` maps a symbol to an asset id; an unknown symbol means no action.
 * Nothing is signed here: each action opens its screen filled in, to review.
 */
export function parseAction(
  query: string,
  assetIdFor: (symbol: string) => string | undefined,
): ParsedAction | undefined {
  const text = query.trim().toLowerCase().replace(/\s+/g, " ");
  const send = new RegExp(`^send \\$?${AMOUNT} ${SYMBOL} to ${NAME}$`).exec(text);
  if (send !== null) {
    const [, amount = "", symbol = "", to = ""] = send;
    const asset = assetIdFor(symbol);
    if (asset === undefined) return undefined;
    const params = new URLSearchParams({ to, asset, amount });
    return {
      title: `Send ${amount} ${symbol.toUpperCase()} to ${to}`,
      to: `/send?${params.toString()}`,
    };
  }
  const swap = new RegExp(`^swap ${SYMBOL} (?:for|to) ${SYMBOL}$`).exec(text);
  if (swap !== null) {
    const [, fromSymbol = "", toSymbol = ""] = swap;
    const from = assetIdFor(fromSymbol);
    const to = assetIdFor(toSymbol);
    if (from === undefined || to === undefined || from === to) return undefined;
    const params = new URLSearchParams({ from, to });
    return {
      title: `Swap ${fromSymbol.toUpperCase()} for ${toSymbol.toUpperCase()}`,
      to: `/swap?${params.toString()}`,
    };
  }
  const buy = new RegExp(`^(?:buy|sell|trade) ${SYMBOL}$`).exec(text);
  if (buy !== null) {
    const [, symbol = ""] = buy;
    const asset = assetIdFor(symbol);
    if (asset === undefined) return undefined;
    return { title: `Trade ${symbol.toUpperCase()}`, to: `/asset/${asset.replace(":", "-")}` };
  }
  return undefined;
}
