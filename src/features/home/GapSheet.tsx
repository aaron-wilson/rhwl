import { Link } from "react-router";
import type { Gap, GapLine } from "../../domain/market/gap";
import { formatFiat, formatPercentBps } from "../../domain/money/format";
import { ListRow } from "../../ui/ListRow";
import { Sheet } from "../../ui/Sheet";
import { TokenIcon } from "../../ui/TokenIcon";
import { assetPath } from "../asset";
import { Private } from "../privacy";

/** The gap line by line: each stock token, then the memes that trade against them. */
export function GapSheet({
  title,
  since,
  gap,
  onClose,
}: {
  readonly title: string;
  readonly since: string;
  readonly gap: Gap;
  readonly onClose: () => void;
}) {
  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      description={`On-chain value against ${since}. The listing reprices at the open.`}
    >
      <div className="flex flex-col gap-4">
        <Group title="Stock Tokens" lines={gap.stocks} />
        <Group title="Paired memes" lines={gap.pairedMemes} />
      </div>
    </Sheet>
  );
}

function Group({ title, lines }: { readonly title: string; readonly lines: readonly GapLine[] }) {
  if (lines.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-1">
      <h3 className="px-1 text-footnote font-semibold text-ink-3">{title}</h3>
      <ul>
        {lines.map((line) => {
          const up = line.change.cents >= 0n;
          return (
            <li key={line.asset.id}>
              <Link
                to={assetPath(line.asset)}
                className="block rounded-md transition-colors duration-fast hover:bg-surface-2"
              >
                <ListRow
                  leading={
                    <TokenIcon
                      symbol={line.asset.symbol}
                      splash={line.asset.splash}
                      {...(line.asset.kind === "stock" ? { badge: "S" } : {})}
                    />
                  }
                  title={line.asset.name}
                  subtitle={
                    <Private>{`${formatFiat(line.atCloseCents)} → ${formatFiat(line.nowCents)}`}</Private>
                  }
                  trailing={
                    <span className={up ? "text-gain" : "text-loss"}>
                      <Private>{formatFiat(line.change.cents, "always")}</Private>
                    </span>
                  }
                  trailingSub={
                    <span className={up ? "text-gain" : "text-loss"}>
                      {formatPercentBps(line.change.bps)}
                    </span>
                  }
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
