import { ArrowDownUp, Minus, Plus, Send } from "lucide-react";
import { Link } from "react-router";
import type { Asset } from "../../data/types";
import type { Side } from "../../domain/trade/order";
import { icon } from "../../ui/icon";

const actions = [
  { label: "Buy", Icon: Plus },
  { label: "Sell", Icon: Minus },
  { label: "Send", Icon: Send },
  { label: "Swap", Icon: ArrowDownUp },
] as const;

/** Buy, Sell, Send and Swap; each is live only where the asset supports it, with the reason shown. */
export function AssetActions({
  asset,
  tradable,
  onChain,
  onTrade,
}: {
  readonly asset: Asset;
  readonly tradable: boolean;
  readonly onChain: boolean;
  readonly onTrade: (side: Side) => void;
}) {
  return (
    <section aria-label="Actions" className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2">
        {actions.map(({ label, Icon }) => {
          const tile = (
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-on-accent">
              <Icon {...icon()} />
            </span>
          );
          const live =
            "flex flex-col items-center gap-1 rounded-md text-footnote font-semibold text-ink-2 hover:text-ink";
          if ((label === "Buy" || label === "Sell") && tradable) {
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onTrade(label === "Buy" ? "buy" : "sell");
                }}
                className={live}
              >
                {tile}
                {label}
              </button>
            );
          }
          if ((label === "Send" || label === "Swap") && onChain) {
            return (
              <Link
                key={label}
                to={
                  label === "Send"
                    ? `/send?asset=${encodeURIComponent(asset.id)}`
                    : `/swap?from=${encodeURIComponent(asset.id)}`
                }
                className={live}
              >
                {tile}
                {label}
              </Link>
            );
          }
          return (
            <button
              key={label}
              type="button"
              disabled
              className="flex flex-col items-center gap-1 text-footnote font-semibold text-ink-3"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-surface-2">
                <Icon {...icon()} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
      {!tradable && (
        <p className="px-1 text-caption text-ink-3">
          {asset.kind === "meme"
            ? `${asset.symbol} has graduated from its curve; trade it on Swap.`
            : asset.kind === "stable"
              ? "Stablecoins are the cash side of every trade; swap them instead."
              : `${asset.symbol} can't be traded here; bridge it to Robinhood Chain first.`}
        </p>
      )}
    </section>
  );
}
