import { useEffect, useState } from "react";
import { useProviders } from "./providers-context";

/** The app clock's current time, refreshed every `everyMs` of clock time. */
export function useNow(everyMs = 60_000): Date {
  const { clock } = useProviders();
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    let cancel: () => void = () => {
      // Replaced by the first scheduled tick.
    };
    const tick = () => {
      setNow(clock.now());
      cancel = clock.schedule(tick, everyMs);
    };
    cancel = clock.schedule(tick, everyMs);
    return () => {
      cancel();
    };
  }, [clock, everyMs]);
  return now;
}
