import { perpMarkets, type PerpMarket } from "../../data/perps";
import { cx } from "../../ui/cx";

interface MarketPickerProps {
  readonly selected: string;
  readonly onSelect: (market: PerpMarket) => void;
}

/** One button per perp market; the selected one is pressed. */
export function MarketPicker({ selected, onSelect }: MarketPickerProps) {
  return (
    <div role="group" aria-label="Market" className="flex flex-wrap gap-2">
      {perpMarkets.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={m.id === selected}
          onClick={() => {
            onSelect(m);
          }}
          className={cx(
            "h-10 rounded-full px-4 text-footnote font-semibold",
            m.id === selected ? "bg-ink text-canvas" : "bg-surface-2 text-ink-2",
          )}
        >
          {m.id}
        </button>
      ))}
    </div>
  );
}
