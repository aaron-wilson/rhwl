import { useState } from "react";
import { Button } from "../../ui/Button";
import { cx } from "../../ui/cx";
import { regions, stockTokensAllowed } from "../../domain/onboarding/regions";

/** Stock Tokens are offered in 120+ countries but not to US persons; the demo says so plainly. */
export function RegionStep({
  onChoose,
  onBack,
}: {
  readonly onChoose: (code: string) => void;
  readonly onBack: () => void;
}) {
  const [code, setCode] = useState<string>("GB");
  return (
    <form
      className="flex flex-col gap-6 pt-16"
      onSubmit={(event) => {
        event.preventDefault();
        onChoose(code);
      }}
    >
      <h1 className="text-title1 font-bold">Where do you live?</h1>
      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">Country of residence</legend>
        {regions.map((region) => (
          <label
            key={region.code}
            className={cx(
              "flex h-12 cursor-pointer items-center justify-between rounded-md px-4 has-focus-visible:outline-2 has-focus-visible:outline-focus",
              code === region.code ? "bg-accent-soft font-semibold" : "hover:bg-surface-2",
            )}
          >
            {region.name}
            <input
              type="radio"
              name="region"
              value={region.code}
              checked={code === region.code}
              onChange={() => {
                setCode(region.code);
              }}
              className="sr-only"
            />
          </label>
        ))}
      </fieldset>
      <p role="status" aria-live="polite" className="text-footnote text-ink-2">
        {!stockTokensAllowed(code)
          ? "Stock Tokens aren't offered to US persons. You'll have crypto and memes."
          : "Stock Tokens, crypto and memes are all available where you live."}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" size="lg" block>
          Finish
        </Button>
      </div>
    </form>
  );
}
