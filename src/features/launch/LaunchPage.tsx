import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import { formatPercentBps, formatPrice } from "../../domain/money/format";
import { Badge } from "../../ui/Badge";
import { gradeTone, radarFor } from "./radar";
import { cx } from "../../ui/cx";
import { PageHeader } from "../../ui/PageHeader";
import { TokenIcon } from "../../ui/TokenIcon";
import { assetPath } from "../asset";
import { useLaunches, type LaunchView } from "./launch-store";

type Filter = "all" | "stock" | "eth" | "soon" | "new";
const filters: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stock", label: "Stock-paired" },
  { value: "eth", label: "ETH-quoted" },
  { value: "soon", label: "Graduating soon" },
  { value: "new", label: "New" },
];
const WEEK = 7 * 24 * 3_600_000;
const launchedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
/** How long a graduation keeps celebrating on its card. */
const CELEBRATE_MS = 60_000;

function matches(filter: Filter, launch: LaunchView, now: Date): boolean {
  const quotes = launch.meme.quotes.map((id) => assetById(id).kind);
  switch (filter) {
    case "all":
      return true;
    case "stock":
      return quotes.includes("stock");
    case "eth":
      return launch.meme.quotes.includes("rh:ETH");
    case "soon":
      return !launch.graduated && launch.progressBps >= 7_500;
    case "new":
      return now.getTime() - Date.parse(launch.meme.launchedAt) <= WEEK;
  }
}

/** Launches on their bonding curves, and the ones that graduated, from the catalog. */
export function LaunchPage() {
  const launches = useLaunches();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("all");
  const shown = useMemo(
    () => launches.filter((l) => matches(filter, l, now)),
    [launches, filter, now],
  );
  const onCurve = shown.filter((l) => !l.graduated).sort((a, b) => b.progressBps - a.progressBps);
  const graduated = shown.filter((l) => l.graduated);

  return (
    <div className="mx-auto flex max-w-content flex-col gap-4 px-4 pb-8 sm:px-8">
      <PageHeader
        title="Launch"
        subtitle="New tokens on bonding curves, paired with Stock Tokens"
      />
      <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => {
              setFilter(f.value);
            }}
            className={cx(
              "h-10 rounded-full px-4 text-footnote font-semibold",
              filter === f.value ? "bg-ink text-canvas" : "bg-surface-2 text-ink-2",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Section
        title="On the curve"
        launches={onCurve}
        now={now}
        empty="Nothing on the curve matches."
      />
      <Section title="Graduated" launches={graduated} now={now} empty="None graduated yet." />
    </div>
  );
}

function Section({
  title,
  launches,
  now,
  empty,
}: {
  readonly title: string;
  readonly launches: readonly LaunchView[];
  readonly now: Date;
  readonly empty: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="px-1 text-footnote font-semibold text-ink-3">{title}</h2>
      {launches.length === 0 ? (
        <p className="px-1 text-body text-ink-2">{empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {launches.map((launch) => (
            <li key={launch.meme.id}>
              <LaunchCard launch={launch} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LaunchCard({ launch, now }: { readonly launch: LaunchView; readonly now: Date }) {
  const { meme } = launch;
  const radar = radarFor(launch);
  const [first = "", ...rest] = meme.quotes.map((id) => assetById(id).symbol);
  const quotes = rest.length === 0 ? first : `${first} +${rest.length}`;
  const celebrating =
    launch.graduatedAt !== undefined && now.getTime() - launch.graduatedAt.getTime() < CELEBRATE_MS;
  return (
    <Link
      to={assetPath(meme)}
      data-testid="launch-card"
      className={cx(
        "flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm transition-[transform,box-shadow] duration-base ease-standard hover:-translate-y-px hover:shadow-md",
        celebrating && "animate-graduate",
      )}
    >
      <span className="flex items-center gap-3">
        <TokenIcon symbol={meme.symbol} splash={meme.splash} />
        <span className="flex flex-1 flex-col">
          <span className="text-headline font-semibold">{meme.name}</span>
          <span className="text-footnote text-ink-3">
            ${meme.symbol} · {meme.launchpad} · launched{" "}
            {launchedDate.format(new Date(meme.launchedAt))}
          </span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <Badge splash={meme.splash}>vs {quotes}</Badge>
          <Badge tone={gradeTone[radar.grade]}>Radar {radar.grade}</Badge>
        </span>
      </span>
      {launch.graduated ? (
        <span className="flex items-center gap-2 text-footnote text-ink-2">
          <Badge tone="gain">{celebrating ? "Just graduated" : "Graduated"}</Badge>
          Trades in an open pool on Swap
        </span>
      ) : (
        <span className="flex flex-col gap-1">
          <span
            role="progressbar"
            aria-label={`${meme.name} curve progress`}
            aria-valuenow={Math.round(launch.progressBps / 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <span
              className="block h-full w-full origin-left rounded-full bg-accent"
              style={{ transform: `scaleX(${launch.progressBps / 10_000})` }}
            />
          </span>
          <span className="text-footnote text-ink-2 tabular-nums">
            {formatPercentBps(BigInt(launch.progressBps), "negative")} to graduation ·{" "}
            {formatPrice(launch.price)}
          </span>
        </span>
      )}
    </Link>
  );
}
