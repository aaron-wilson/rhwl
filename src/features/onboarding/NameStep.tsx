import { useState } from "react";
import { NAME_SUFFIX } from "../../domain/onboarding/names";
import { Button } from "../../ui/Button";
import { cx } from "../../ui/cx";
import { useNameAvailability } from "./useNameAvailability";

const message = {
  idle: "Your name is how friends send to you instead of a long address.",
  checking: "Checking…",
} as const;

export function NameStep({ onClaim }: { readonly onClaim: (name: string) => void }) {
  const [input, setInput] = useState("");
  const availability = useNameAvailability(input);
  const hint =
    availability.state === "invalid"
      ? availability.reason
      : availability.state === "taken"
        ? `Taken. Try ${availability.suggestion}${NAME_SUFFIX}`
        : availability.state === "available"
          ? `${availability.name}${NAME_SUFFIX} is yours to claim`
          : message[availability.state];
  const tone =
    availability.state === "invalid" || availability.state === "taken"
      ? "text-loss"
      : availability.state === "available"
        ? "text-gain"
        : "text-ink-3";
  return (
    <form
      className="flex flex-col gap-6 pt-16"
      onSubmit={(event) => {
        event.preventDefault();
        if (availability.state === "available") onClaim(availability.name);
      }}
    >
      <h1 className="text-title1 font-bold">Claim your name</h1>
      <div className="flex flex-col gap-2">
        <label htmlFor="claim-name" className="text-footnote font-semibold text-ink-2">
          Name
        </label>
        <span className="flex h-14 items-center rounded-md bg-surface-2 px-4 text-title3 has-focus-visible:outline-2 has-focus-visible:outline-focus">
          <input
            id="claim-name"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            aria-describedby="name-hint"
            className="min-w-0 flex-1 bg-transparent font-semibold outline-none"
          />
          <span aria-hidden="true" className="text-ink-3">
            {NAME_SUFFIX}
          </span>
        </span>
      </div>
      <p id="name-hint" role="status" aria-live="polite" className={cx("text-footnote", tone)}>
        {hint}
      </p>
      {availability.state === "taken" && (
        <Button
          variant="secondary"
          onClick={() => {
            setInput(availability.suggestion);
          }}
        >
          Use {availability.suggestion}
          {NAME_SUFFIX}
        </Button>
      )}
      <Button type="submit" size="lg" block disabled={availability.state !== "available"}>
        Continue
      </Button>
    </form>
  );
}
