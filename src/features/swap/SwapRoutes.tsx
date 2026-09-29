import { formatPercentBps, formatToken } from "../../domain/money/format";
import type { Route } from "../../domain/swap/routes";
import { cx } from "../../ui/cx";

/** The aggregator's routes, best first; one is selected. */
export function SwapRoutes({
  routes,
  selectedId,
  toSymbol,
  onSelect,
}: {
  readonly routes: readonly Route[];
  readonly selectedId: string | undefined;
  readonly toSymbol: string;
  readonly onSelect: (venueId: string) => void;
}) {
  return (
    <section aria-labelledby="routes" className="flex flex-col gap-2">
      <h2 id="routes" className="px-1 text-footnote font-semibold text-ink-3">
        Routes
      </h2>
      <div role="radiogroup" aria-labelledby="routes" className="flex flex-col gap-2">
        {routes.map((r, index) => {
          const selected = r.venue.id === selectedId;
          return (
            <button
              key={r.venue.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                onSelect(r.venue.id);
              }}
              className={cx(
                "flex items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors duration-fast",
                selected ? "border-accent bg-accent-soft" : "border-line bg-surface",
              )}
            >
              <span className="flex flex-col">
                <span className="flex items-center gap-2 text-body font-semibold">
                  {r.venue.name}
                  {index === 0 && (
                    <span className="rounded-full bg-accent px-2 text-caption text-on-accent">
                      Best
                    </span>
                  )}
                </span>
                <span className="text-footnote text-ink-3">
                  Fee {formatPercentBps(BigInt(r.venue.feeBps), "negative")} · impact{" "}
                  {formatPercentBps(r.impactBps, "negative")}
                </span>
              </span>
              <span className="text-body font-semibold tabular-nums">
                {formatToken(r.out, toSymbol)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
