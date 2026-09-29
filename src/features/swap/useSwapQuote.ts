import { useEffect, useReducer } from "react";
import { useProviders } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import { amount, type Amount } from "../../domain/money/amount";
import {
  QUOTE_LATENCY_MS,
  QUOTE_TTL_MS,
  quoteReducer,
  type QuoteState,
} from "../../domain/swap/quote";
import { quoteRoutes } from "../../domain/swap/routes";

/**
 * Asks the demo aggregator for routes whenever the pair or amount changes, and
 * again each time a quote reaches the end of its life. All timing runs on the
 * app clock, so tests and presenter mode can fast-forward it.
 */
export function useSwapQuote(
  fromId: string,
  toId: string,
  amountIn: Amount | undefined,
): QuoteState {
  const { clock, market } = useProviders();
  const [state, dispatch] = useReducer(quoteReducer, { status: "idle" });
  // Primitives, so a new Amount object with the same value does not restart the quote.
  const base = amountIn?.base;
  const decimals = amountIn?.decimals;

  useEffect(() => {
    if (base === undefined || decimals === undefined || fromId === toId) {
      dispatch({ type: "clear" });
      return;
    }
    let cancel: () => void = () => undefined;
    const ask = () => {
      dispatch({ type: "request" });
      cancel = clock.schedule(() => {
        const now = clock.now();
        const routes = quoteRoutes(
          { asset: assetById(fromId), price: market.price(fromId, now) },
          { asset: assetById(toId), price: market.price(toId, now) },
          amount(base, decimals),
        );
        dispatch({ type: "receive", routes, at: now });
        cancel = clock.schedule(() => {
          dispatch({ type: "expire" });
          ask();
        }, QUOTE_TTL_MS);
      }, QUOTE_LATENCY_MS);
    };
    ask();
    return () => {
      cancel();
    };
  }, [fromId, toId, base, decimals, clock, market]);

  return state;
}
