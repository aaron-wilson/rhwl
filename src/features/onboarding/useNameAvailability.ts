import { useEffect, useState } from "react";
import { useProviders } from "../../app/providers-context";
import { checkName, takenNames } from "../../domain/onboarding/names";

export type Availability =
  | { readonly state: "idle" }
  | { readonly state: "invalid"; readonly reason: string }
  | { readonly state: "checking" }
  | { readonly state: "available"; readonly name: string }
  | { readonly state: "taken"; readonly suggestion: string };

const DEBOUNCE_MS = 300;
const LOOKUP_MS = 250;

function suggest(name: string): string {
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${name}${n}`;
    if (!takenNames.has(candidate)) return candidate;
  }
  return `${name}-rh`;
}

/**
 * Validates as the user types, then checks availability after a pause, like a
 * real name service. Both waits run on the app clock.
 */
export function useNameAvailability(input: string): Availability {
  const { clock } = useProviders();
  const [result, setResult] = useState<Availability>({ state: "idle" });
  const check = checkName(input);
  const valid = check.ok ? check.name : undefined;

  useEffect(() => {
    if (valid === undefined) return;
    let cancelLookup: () => void = () => {
      // Replaced once the lookup starts.
    };
    const cancelDebounce = clock.schedule(() => {
      setResult({ state: "checking" });
      cancelLookup = clock.schedule(() => {
        setResult(
          takenNames.has(valid)
            ? { state: "taken", suggestion: suggest(valid) }
            : { state: "available", name: valid },
        );
      }, LOOKUP_MS);
    }, DEBOUNCE_MS);
    return () => {
      cancelDebounce();
      cancelLookup();
      setResult({ state: "idle" });
    };
  }, [valid, clock]);

  if (input.trim() === "") return { state: "idle" };
  if (!check.ok) return { state: "invalid", reason: check.reason };
  return result.state === "available" && result.name !== valid ? { state: "checking" } : result;
}
