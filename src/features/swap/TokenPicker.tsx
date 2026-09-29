import { useId, useState } from "react";
import { assetById, assets } from "../../data/assets";
import type { Asset } from "../../data/types";
import type { Holding } from "../../ports/chain";
import { formatToken } from "../../domain/money/format";
import { Badge } from "../../ui/Badge";
import { ListRow } from "../../ui/ListRow";
import { Sheet } from "../../ui/Sheet";
import { TokenIcon } from "../../ui/TokenIcon";
import { Private } from "../privacy";
import { rememberSwapAsset, useRecentSwapAssets } from "./swap-store";

const swappable = assets.filter((a) => a.chain === "robinhood");

function matches(asset: Asset, query: string): boolean {
  const q = query.trim().toLowerCase();
  return q === "" || asset.symbol.toLowerCase().includes(q) || asset.name.toLowerCase().includes(q);
}

/** Search, recents and verified badges; launchpad tokens are marked as such. */
export function TokenPicker({
  title,
  exclude,
  holdings,
  onPick,
  onClose,
}: {
  readonly title: string;
  readonly exclude: string;
  readonly holdings: readonly Holding[];
  readonly onPick: (assetId: string) => void;
  readonly onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const recents = useRecentSwapAssets().filter((id) => id !== exclude);
  const searchId = useId();
  const list = swappable.filter((a) => a.id !== exclude && matches(a, query));
  const pick = (id: string) => {
    rememberSwapAsset(id);
    onPick(id);
  };

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <label htmlFor={searchId} className="sr-only">
          Search tokens
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Search by name or symbol"
          autoComplete="off"
          className="h-12 w-full rounded-md bg-surface-2 px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus"
        />
        {recents.length > 0 && query === "" && (
          <div role="group" aria-label="Recent" className="flex flex-wrap gap-2">
            {recents.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  pick(id);
                }}
                className="h-10 rounded-full bg-surface-2 px-4 text-footnote font-semibold"
              >
                {assetById(id).symbol}
              </button>
            ))}
          </div>
        )}
        {list.length === 0 ? (
          <p className="text-body text-ink-2">No token matches “{query.trim()}”.</p>
        ) : (
          <ul aria-label="Tokens" className="flex flex-col">
            {list.map((asset) => {
              const held = holdings.find((h) => h.assetId === asset.id)?.quantity;
              return (
                <li key={asset.id}>
                  <ListRow
                    leading={<TokenIcon symbol={asset.symbol} splash={asset.splash} />}
                    title={
                      <span className="flex items-center gap-2">
                        {asset.symbol}
                        {asset.kind === "meme" ? (
                          <Badge tone="warn">Launchpad</Badge>
                        ) : (
                          <Badge tone="accent">Verified</Badge>
                        )}
                      </span>
                    }
                    subtitle={asset.name}
                    trailing={
                      held === undefined ? undefined : (
                        <Private>{formatToken(held, asset.symbol)}</Private>
                      )
                    }
                    onClick={() => {
                      pick(asset.id);
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
