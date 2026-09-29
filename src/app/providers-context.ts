import { createContext, useContext } from "react";
import type { Providers } from "../ports/providers";

export const ProvidersContext = createContext<Providers | undefined>(undefined);

/** The outside world, as ports. Feature code never sees which adapters are behind them. */
export function useProviders(): Providers {
  const providers = useContext(ProvidersContext);
  if (providers === undefined) throw new Error("useProviders needs a ProvidersContext above it");
  return providers;
}
