import { X } from "lucide-react";
import { useId } from "react";
import { assetById } from "../../data/assets";
import { evenSplit, FULL_BPS, MAX_MEMBERS, type Weight } from "../../domain/basket/basket";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { Slider } from "../../ui/Slider";
import { TokenIcon } from "../../ui/TokenIcon";
import { basketable } from "./basket-store";

/** Members with a weight slider each, plus add, remove and even split. */
export function BasketMembers({
  weights,
  onChange,
}: {
  readonly weights: readonly Weight[];
  readonly onChange: (weights: readonly Weight[]) => void;
}) {
  const addId = useId();
  const total = weights.reduce((sum, w) => sum + w.bps, 0);
  const addable = basketable.filter((a) => !weights.some((w) => w.assetId === a.id));
  return (
    <section aria-labelledby="basket-members" className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 id="basket-members" className="text-footnote font-semibold text-ink-3">
          Weights
        </h2>
        <span
          className={total === FULL_BPS ? "text-footnote text-ink-3" : "text-footnote text-loss"}
          data-testid="weights-total"
        >
          {(total / 100).toFixed(0)}% of 100%
        </span>
      </div>
      <Card className="flex flex-col gap-4">
        {weights.map((w) => {
          const asset = assetById(w.assetId);
          return (
            <div key={w.assetId} className="flex items-center gap-3">
              <TokenIcon symbol={asset.symbol} splash={asset.splash} size="sm" />
              <Slider
                label={`${asset.symbol} weight`}
                value={w.bps / 100}
                min={0}
                max={100}
                format={(v) => `${v}%`}
                onChange={(pct) => {
                  onChange(weights.map((x) => (x === w ? { ...x, bps: pct * 100 } : x)));
                }}
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                aria-label={`Remove ${asset.symbol}`}
                onClick={() => {
                  onChange(weights.filter((x) => x !== w));
                }}
                className="rounded-full p-1 text-ink-3 hover:text-ink"
              >
                <X {...icon()} />
              </button>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-2">
          {weights.length < MAX_MEMBERS && addable.length > 0 && (
            <>
              <label htmlFor={addId} className="sr-only">
                Add an asset
              </label>
              <select
                id={addId}
                value=""
                onChange={(event) => {
                  onChange([...weights, { assetId: event.target.value, bps: 0 }]);
                }}
                className="h-8 rounded-md bg-surface-2 px-3 text-footnote"
              >
                <option value="" disabled>
                  Add an asset…
                </option>
                {addable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.symbol} · {a.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <Button
            size="sm"
            variant="secondary"
            disabled={weights.length === 0}
            onClick={() => {
              onChange(evenSplit(weights.map((w) => w.assetId)));
            }}
          >
            Split evenly
          </Button>
        </div>
      </Card>
    </section>
  );
}
