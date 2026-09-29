import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import { setTint } from "../../app/tint";
import { formatFiat } from "../../domain/money/format";
import { changeBetween } from "../../domain/portfolio/portfolio";
import { formatWhen } from "../../domain/time/format";
import { LineChart } from "../../ui/chart/LineChart";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { useBalancesHidden } from "../privacy";
import { AccountButton } from "../accounts";
import { CollectiblesPreview } from "../collectibles";
import { GapRadar } from "./GapRadar";

const EarningsCard = lazy(async () => ({
  default: (await import("../earnings/EarningsCard")).EarningsCard,
}));
const GuardrailsStatus = lazy(async () => ({
  default: (await import("../guardrails/GuardrailsStatus")).GuardrailsStatus,
}));
const PairLensSummary = lazy(async () => ({
  default: (await import("../pair-lens/PairLensSummary")).PairLensSummary,
}));
import { HomeActions } from "./HomeActions";
import { HoldingsList } from "./HoldingsList";
import { useShellSlots } from "../../app/shell/slots";
import { PortfolioHeader } from "./PortfolioHeader";
import { ranges, type RangeKey } from "./ranges";
import { usePortfolio } from "./usePortfolio";

export function HomePage() {
  const { inboxBell, searchButton } = useShellSlots();
  const [range, setRange] = useState<RangeKey>("1D");
  // The control moves on the tap; the chart follows once its series is built, so the tap paints at once.
  const shownRange = useDeferredValue(range);
  const [active, setActive] = useState<number | undefined>(undefined);
  const portfolio = usePortfolio(shownRange);
  const hidden = useBalancesHidden();
  const values = useMemo(
    () => portfolio.totals.map((cents) => Number(cents) / 100),
    [portfolio.totals],
  );
  const up = portfolio.change.cents >= 0n;

  // The selected range's direction tints the whole app.
  useEffect(() => {
    setTint(up ? "gain" : "loss");
  }, [up]);

  const shownCents =
    active === undefined ? portfolio.total : (portfolio.totals[active] ?? portfolio.total);
  const shownChange =
    active === undefined ? portfolio.change : changeBetween(portfolio.totals[0] ?? 0n, shownCents);
  const phrase = ranges.find((r) => r.key === shownRange)?.phrase ?? "";
  const lastTime = portfolio.times.at(-1) ?? new Date(0);
  const caption =
    active === undefined ? phrase : formatWhen(portfolio.times[active] ?? lastTime, lastTime);
  const describe = (i: number) =>
    `${formatWhen(portfolio.times[i] ?? lastTime, lastTime)}, ${hidden ? "hidden amount" : formatFiat(portfolio.totals[i] ?? 0n)}`;

  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-4 pt-6 sm:px-8">
      <div className="flex items-center justify-end gap-2 lg:hidden">
        {searchButton}
        {inboxBell}
        <AccountButton compact />
      </div>
      <PortfolioHeader valueCents={shownCents} change={shownChange} caption={caption} />
      <div className="flex flex-col gap-3">
        <LineChart
          values={values}
          baseline={values[0]}
          active={active}
          onActiveChange={setActive}
          label={`Portfolio value, ${phrase}`}
          describe={describe}
        />
        <SegmentedControl
          label="Chart range"
          options={ranges.map((r) => ({ value: r.key, label: r.label }))}
          value={range}
          onChange={(next) => {
            setActive(undefined);
            setRange(next);
          }}
        />
      </div>
      <HomeActions />
      <GapRadar />
      <Suspense fallback={null}>
        <EarningsCard />
      </Suspense>
      <Suspense fallback={null}>
        <GuardrailsStatus link />
      </Suspense>
      <HoldingsList rows={portfolio.rows} />
      <Suspense fallback={null}>
        <PairLensSummary />
      </Suspense>
      <CollectiblesPreview />
    </div>
  );
}
