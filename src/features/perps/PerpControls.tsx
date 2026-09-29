import { useId } from "react";
import { inputClass } from "./perp-form";

/** Optional take-profit and stop-loss prices. */
export function TriggerInputs({
  tp,
  sl,
  onTp,
  onSl,
}: {
  readonly tp: string;
  readonly sl: string;
  readonly onTp: (text: string) => void;
  readonly onSl: (text: string) => void;
}) {
  const ids = { tp: useId(), sl: useId() };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.tp} className="text-footnote text-ink-3">
          Take profit (optional)
        </label>
        <input
          id={ids.tp}
          inputMode="decimal"
          placeholder="$"
          value={tp}
          onChange={(event) => {
            onTp(event.target.value);
          }}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.sl} className="text-footnote text-ink-3">
          Stop loss (optional)
        </label>
        <input
          id={ids.sl}
          inputMode="decimal"
          placeholder="$"
          value={sl}
          onChange={(event) => {
            onSl(event.target.value);
          }}
          className={inputClass}
        />
      </div>
    </div>
  );
}
