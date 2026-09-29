import type { ControllableClock } from "../../ports/clock";

interface Timer {
  readonly id: number;
  readonly due: number;
  readonly fn: () => void;
}

export interface DemoClockOptions {
  /** Start stopped, so not even a millisecond passes before the first advance. */
  readonly frozen?: boolean;
  readonly realNow?: () => number;
}

/**
 * A virtual clock that starts at a chosen instant and runs at real speed until
 * frozen. `advance` jumps ahead and fires timers in order, so a week of yield
 * or a quote expiry can be shown in one click.
 */
export function createDemoClock(
  start: Date,
  { frozen: startFrozen = false, realNow = () => Date.now() }: DemoClockOptions = {},
): ControllableClock {
  let virtualAt = start.getTime();
  let realAt = realNow();
  let frozen = startFrozen;
  let timers: Timer[] = [];
  let nextId = 1;

  const current = () => (frozen ? virtualAt : virtualAt + (realNow() - realAt));

  function flush() {
    const at = current();
    const due = timers.filter((t) => t.due <= at).sort((a, b) => a.due - b.due || a.id - b.id);
    timers = timers.filter((t) => t.due > at);
    due.forEach((t) => {
      t.fn();
    });
  }

  function rebase() {
    virtualAt = current();
    realAt = realNow();
  }

  return {
    now: () => new Date(current()),
    schedule(fn, ms) {
      const timer = { id: nextId, due: current() + ms, fn };
      nextId += 1;
      timers.push(timer);
      const real = frozen ? undefined : setTimeout(flush, ms);
      return () => {
        timers = timers.filter((t) => t.id !== timer.id);
        if (real !== undefined) clearTimeout(real);
      };
    },
    advance(ms) {
      rebase();
      const target = virtualAt + ms;
      // Step through each due time in order, so a timer scheduled by another
      // timer is measured from the moment it was scheduled, not from the target.
      for (;;) {
        const next = timers
          .filter((t) => t.due <= target)
          .sort((a, b) => a.due - b.due || a.id - b.id)[0];
        if (next === undefined) break;
        virtualAt = Math.max(virtualAt, next.due);
        timers = timers.filter((t) => t.id !== next.id);
        next.fn();
      }
      virtualAt = target;
    },
    setFrozen(next) {
      rebase();
      frozen = next;
    },
    get frozen() {
      return frozen;
    },
  };
}
