import { useId, useState } from "react";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { amount, parseAmount, valueInCents } from "../../domain/money/amount";
import { formatFiat } from "../../domain/money/format";
import { formatWhen } from "../../domain/time/format";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { addAlert, rearmAlert, removeAlert, useAlerts } from "./alerts-store";

const directions = [
  { value: "above", label: "Rises above" },
  { value: "below", label: "Falls below" },
] as const;

/** Price alerts for one asset: set one, see which fired, re-arm or remove them. */
export function AlertsCard({
  assetId,
  symbol,
}: {
  readonly assetId: string;
  readonly symbol: string;
}) {
  const { market } = useProviders();
  const now = useNow(5_000);
  const alerts = useAlerts(assetId);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const inputId = useId();
  const priceCents = valueInCents(amount(1n, 0), market.price(assetId, now));
  const thresholdCents = parseAmount(text, 2)?.base;

  function set() {
    if (thresholdCents === undefined) return;
    const result = addAlert({ assetId, direction, thresholdCents }, priceCents);
    setProblem(
      result === undefined
        ? undefined
        : `${symbol} is already ${direction} ${formatFiat(thresholdCents)}. Pick a price it has not reached.`,
    );
    if (result === undefined) setText("");
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="flex flex-col gap-2">
      <h2 id={`${inputId}-title`} className="px-1 text-footnote font-semibold text-ink-3">
        Price alerts
      </h2>
      <Card className="flex flex-col gap-3">
        <SegmentedControl
          label="Alert when the price"
          options={directions}
          value={direction}
          onChange={setDirection}
        />
        <label htmlFor={inputId} className="text-footnote text-ink-2">
          Alert price in dollars (now {formatFiat(priceCents)})
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            inputMode="decimal"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setProblem(undefined);
            }}
            className="min-w-0 flex-1 rounded-md bg-surface-2 px-3 text-body"
          />
          <Button disabled={thresholdCents === undefined || thresholdCents <= 0n} onClick={set}>
            Set alert
          </Button>
        </div>
        {problem !== undefined && (
          <p role="alert" className="text-footnote text-loss">
            {problem}
          </p>
        )}
        {alerts.length > 0 && (
          <ul aria-label={`${symbol} alerts`} className="flex flex-col gap-2">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-body">
                <span className="flex flex-col">
                  {a.direction === "above" ? "Above" : "Below"} {formatFiat(a.thresholdCents)}
                  <span className="text-footnote text-ink-2">
                    {a.armed ? "Armed" : `Fired ${formatWhen(a.firedAt ?? now, now)}`}
                  </span>
                </span>
                <span className="flex gap-1">
                  {!a.armed && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => rearmAlert(a.id, priceCents)}
                    >
                      Re-arm
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeAlert(a.id);
                    }}
                  >
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
