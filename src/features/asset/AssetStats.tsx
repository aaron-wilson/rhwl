import { chains } from "../../data/chains";
import type { Asset } from "../../data/types";
import { formatPrice } from "../../domain/money/format";
import type { Amount } from "../../domain/money/amount";
import { Card } from "../../ui/Card";
import { useLaunch } from "../launch";

interface Stat {
  readonly label: string;
  readonly value: string;
}

const kindLabel = {
  crypto: "Crypto",
  stable: "Stablecoin",
  stock: "Stock Token",
  meme: "Meme token",
} as const;

const dateOnly = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const count = new Intl.NumberFormat("en-US");
const percent = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

function statsFor(
  asset: Asset,
  curve: { readonly graduated: boolean; readonly progressBps: number } | undefined,
): readonly Stat[] {
  switch (asset.kind) {
    case "stock":
      return [
        { label: "Exchange", value: asset.exchange },
        { label: "Sector", value: asset.sector },
        {
          label: "Next earnings",
          value: dateOnly.format(new Date(`${asset.nextEarnings}T00:00:00Z`)),
        },
      ];
    case "meme":
      return [
        { label: "Launchpad", value: asset.launchpad },
        { label: "Holders", value: count.format(asset.holders) },
        { label: "Dev wallet holds", value: percent(asset.devShareBps) },
        {
          label: "Bonding curve",
          value:
            curve === undefined || curve.graduated
              ? "Graduated"
              : `${percent(curve.progressBps)} filled`,
        },
      ];
    default:
      return [{ label: "Type", value: kindLabel[asset.kind] }];
  }
}

/** Key facts: today's range, the network, and what matters for the asset's kind. */
export function AssetStats({
  asset,
  dayLow,
  dayHigh,
}: {
  readonly asset: Asset;
  readonly dayLow: Amount;
  readonly dayHigh: Amount;
}) {
  const launch = useLaunch(asset.id);
  const network = chains.find((c) => c.id === asset.chain)?.name ?? asset.chain;
  const stats: readonly Stat[] = [
    { label: "Today's low", value: formatPrice(dayLow) },
    { label: "Today's high", value: formatPrice(dayHigh) },
    { label: "Network", value: network },
    ...statsFor(asset, launch),
  ];
  return (
    <section aria-labelledby="asset-stats" className="flex flex-col gap-2">
      <h2 id="asset-stats" className="px-1 text-footnote font-semibold text-ink-3">
        Key stats
      </h2>
      <Card>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <dt className="text-footnote text-ink-3">{stat.label}</dt>
              <dd className="text-body font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}
