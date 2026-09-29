import { useMemo, useState } from "react";
import { useProviders } from "../../app/providers-context";
import { rescale } from "../../domain/money/amount";
import { formatFiat } from "../../domain/money/format";
import { LineChart } from "../../ui/chart/LineChart";
import { Sparkline } from "../../ui/chart/Sparkline";
import { Section } from "./Section";

const time = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  day: "numeric",
});

/** The chart primitive on a live demo series: NVDA over the demo clock's trading day. */
export function ChartSpecimens() {
  const { market, clock } = useProviders();
  const [active, setActive] = useState<number | undefined>(undefined);
  const series = useMemo(() => {
    const to = clock.now();
    return market.series("rh:NVDA", new Date(to.getTime() - 24 * 3_600_000), to, 200);
  }, [market, clock]);
  const values = useMemo(() => series.map((p) => Number(p.price.base) / 1e8), [series]);
  const cents = (i: number) => rescale(series[i]?.price ?? { base: 0n, decimals: 8 }, 2).base;
  const shown = active ?? series.length - 1;
  const describe = (i: number) =>
    `${time.format(series[i]?.at ?? new Date(0))}, ${formatFiat(cents(i))}`;

  return (
    <Section title="Chart">
      <div className="flex flex-col">
        <span className="text-title2 font-bold tabular-nums" data-testid="chart-readout">
          {formatFiat(cents(shown))}
        </span>
        <span className="text-footnote text-ink-3">
          {time.format(series[shown]?.at ?? new Date(0))}
        </span>
      </div>
      <LineChart
        values={values}
        baseline={values[0]}
        active={active}
        onActiveChange={setActive}
        label="NVDA price, last 24 hours"
        describe={describe}
      />
      <div className="flex items-center gap-4 text-footnote text-ink-2">
        <Sparkline values={values} up={(values.at(-1) ?? 0) >= (values[0] ?? 0)} />
        Sparkline for list rows
      </div>
    </Section>
  );
}
