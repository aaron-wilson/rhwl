import type { Asset } from "../../data/types";
import { formatDuration, type BridgeRoute } from "../../domain/bridge/routes";
import { formatFiat, formatToken } from "../../domain/money/format";
import { cx } from "../../ui/cx";
import type { RouteId } from "./useBridgeQuote";

export interface BridgeRoutesProps {
  readonly routes: readonly BridgeRoute[];
  readonly route: BridgeRoute | undefined;
  readonly toAsset: Asset;
  readonly onSelect: (id: RouteId) => void;
}

/** The priced route cards, as a radio group. */
export function BridgeRoutes({ routes, route, toAsset, onSelect }: BridgeRoutesProps) {
  if (routes.length === 0) return null;
  return (
    <div role="radiogroup" aria-label="Routes" className="flex flex-col gap-2">
      {routes.map((r) => (
        <button
          key={r.id}
          type="button"
          role="radio"
          aria-checked={r.id === route?.id}
          onClick={() => {
            onSelect(r.id);
          }}
          className={cx(
            "flex items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors duration-fast",
            r.id === route?.id ? "border-accent bg-accent-soft" : "border-line bg-surface",
          )}
        >
          <span className="flex flex-col">
            <span className="text-body font-semibold">{r.name}</span>
            <span className="text-footnote text-ink-3">
              About {formatDuration(r.seconds)} · fee {formatFiat(r.feeCents)}
            </span>
          </span>
          <span className="text-body font-semibold tabular-nums">
            {formatToken(r.out, toAsset.symbol)}
          </span>
        </button>
      ))}
    </div>
  );
}
