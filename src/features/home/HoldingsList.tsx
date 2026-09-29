import { SMALL_BALANCE_CENTS, useHideSmall } from "../../app/preferences";
import { Link } from "react-router";
import { chains } from "../../data/chains";
import type { Asset } from "../../data/types";

const chainNames = Object.fromEntries(chains.map((c) => [c.id, c.name]));
import { formatFiat, formatPercentBps, formatToken } from "../../domain/money/format";
import { Card } from "../../ui/Card";
import { Sparkline } from "../../ui/chart/Sparkline";
import { ListRow } from "../../ui/ListRow";
import { TokenIcon } from "../../ui/TokenIcon";
import { assetPath } from "../asset";
import { Private } from "../privacy";
import type { HoldingRow } from "./usePortfolio";

const groups: readonly { title: string; kinds: readonly Asset["kind"][] }[] = [
  { title: "Stock Tokens", kinds: ["stock"] },
  { title: "Crypto", kinds: ["crypto", "stable"] },
  { title: "Memes", kinds: ["meme"] },
];

/** Holdings grouped by kind, largest first, each with a day sparkline and its change. */
export function HoldingsList({ rows }: { readonly rows: readonly HoldingRow[] }) {
  const hideSmall = useHideSmall();
  const shown = hideSmall ? rows.filter((row) => row.valueCents >= SMALL_BALANCE_CENTS) : rows;
  return (
    <>
      {groups.map((group) => {
        const members = shown.filter((row) => group.kinds.includes(row.asset.kind));
        if (members.length === 0) return null;
        return (
          <section key={group.title} aria-label={group.title} className="flex flex-col gap-2">
            <h2 className="px-1 text-footnote font-semibold text-ink-3">{group.title}</h2>
            <Card padding="list" className="flex flex-col">
              <ul>
                {members.map((row) => {
                  const up = row.changeBps >= 0n;
                  return (
                    <li key={row.asset.id}>
                      <Link
                        to={assetPath(row.asset)}
                        className="block rounded-md transition-colors duration-fast hover:bg-surface-2 active:bg-surface-2"
                      >
                        <ListRow
                          leading={
                            row.asset.kind === "stock" ? (
                              <TokenIcon
                                symbol={row.asset.symbol}
                                splash={row.asset.splash}
                                badge="S"
                              />
                            ) : (
                              <TokenIcon symbol={row.asset.symbol} splash={row.asset.splash} />
                            )
                          }
                          title={row.asset.name}
                          subtitle={
                            <>
                              <Private>{formatToken(row.quantity, row.asset.symbol)}</Private>
                              {row.asset.chain !== "robinhood" &&
                                ` · ${chainNames[row.asset.chain] ?? row.asset.chain}`}
                            </>
                          }
                          trailing={
                            <span className="flex items-center gap-3">
                              <Sparkline values={row.spark} up={up} className="hidden sm:block" />
                              <Private>{formatFiat(row.valueCents)}</Private>
                            </span>
                          }
                          trailingSub={
                            <span className={up ? "text-gain" : "text-loss"}>
                              {formatPercentBps(row.changeBps)}
                            </span>
                          }
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        );
      })}
    </>
  );
}
