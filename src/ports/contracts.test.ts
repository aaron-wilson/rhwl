import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserClock } from "../adapters/browser/clock";
import { createBrowserHaptics } from "../adapters/browser/haptics";
import { createBrowserStorage } from "../adapters/browser/storage";
import { createDemoClock } from "../adapters/demo/clock";
import { createDemoHaptics } from "../adapters/demo/haptics";
import { createDemoShare } from "../adapters/demo/share";
import { createDemoClipboard } from "../adapters/demo/clipboard";
import { createBrowserClipboard } from "../adapters/browser/clipboard";
import { PortError } from "./errors";
import { createMemoryStorage } from "../adapters/demo/storage";
import type { Clock } from "./clock";
import type { KeyValueStorage } from "./storage";

// One spec per port, run verbatim against every adapter, so demo and browser stay interchangeable.

describe.each([
  ["memory", createMemoryStorage],
  ["browser", () => createBrowserStorage()],
  ["browser session", () => createBrowserStorage("session")],
] as const)("KeyValueStorage contract: %s", (_name, create: () => KeyValueStorage) => {
  it("reads back what it wrote, and nothing after removal", () => {
    const storage = create();
    expect(storage.get("contract:missing")).toBeUndefined();
    storage.set("contract:k", "v1");
    storage.set("contract:k", "v2");
    expect(storage.get("contract:k")).toBe("v2");
    storage.remove("contract:k");
    expect(storage.get("contract:k")).toBeUndefined();
  });
});

describe.each([
  [
    "demo",
    () => ({
      clock: createDemoClock(new Date("2026-10-02T15:00:00Z")),
      pass: (ms: number) => vi.advanceTimersByTime(ms),
    }),
  ],
  [
    "browser",
    () => ({ clock: createBrowserClock(), pass: (ms: number) => vi.advanceTimersByTime(ms) }),
  ],
] as const)(
  "Clock contract: %s",
  (_name, create: () => { clock: Clock; pass: (ms: number) => void }) => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("fires a scheduled callback once its delay has passed, and not before", () => {
      vi.useFakeTimers();
      const { clock, pass } = create();
      const fn = vi.fn();
      clock.schedule(fn, 1000);
      pass(999);
      expect(fn).not.toHaveBeenCalled();
      pass(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("never fires a cancelled callback", () => {
      vi.useFakeTimers();
      const { clock, pass } = create();
      const fn = vi.fn();
      clock.schedule(fn, 10)();
      pass(50);
      expect(fn).not.toHaveBeenCalled();
    });

    it("moves forward with time", () => {
      vi.useFakeTimers();
      const { clock, pass } = create();
      const before = clock.now().getTime();
      pass(250);
      expect(clock.now().getTime() - before).toBe(250);
    });
  },
);

describe("demo clock controls", () => {
  it("measures a timer set by another timer from when it was set, within one advance", () => {
    const clock = createDemoClock(new Date("2026-10-03T16:00:00Z"), { frozen: true });
    const fired: string[] = [];
    clock.schedule(() => {
      fired.push(`outer@${clock.now().toISOString()}`);
      clock.schedule(() => fired.push(`inner@${clock.now().toISOString()}`), 250);
    }, 300);
    clock.advance(600);
    expect(fired).toEqual(["outer@2026-10-03T16:00:00.300Z", "inner@2026-10-03T16:00:00.550Z"]);
    expect(clock.now().toISOString()).toBe("2026-10-03T16:00:00.600Z");
  });

  it("starts at the chosen instant, freezes, and fast-forwards through timers in order", () => {
    const clock = createDemoClock(new Date("2026-10-03T16:00:00Z"), { frozen: true });
    const order: string[] = [];
    clock.schedule(() => order.push("b"), 2 * 3_600_000);
    clock.schedule(() => order.push("a"), 60_000);
    expect(clock.now().toISOString()).toBe("2026-10-03T16:00:00.000Z");
    clock.advance(3 * 3_600_000);
    expect(order).toEqual(["a", "b"]);
    expect(clock.now().toISOString()).toBe("2026-10-03T19:00:00.000Z");
  });
});

describe.each([
  ["demo", createDemoHaptics],
  ["browser", createBrowserHaptics],
] as const)("Haptics contract: %s", (_name, create) => {
  it.each(["light", "success", "warning", "error"] as const)(
    "plays %s without throwing",
    (kind) => {
      expect(() => {
        create().play(kind);
      }).not.toThrow();
    },
  );
});

describe("Share contract: demo", () => {
  it("reports how the payload left the app", async () => {
    const share = createDemoShare();
    await expect(share.share({ title: "Wallet", text: "Positions or ban" })).resolves.toBe(
      "copied",
    );
    expect(share.shared).toHaveLength(1);
  });
});

describe("Clipboard contract", () => {
  it("demo: keeps what was copied", async () => {
    const clipboard = createDemoClipboard();
    await clipboard.copy("0x8f3a");
    expect(clipboard.copied).toEqual(["0x8f3a"]);
  });

  it("browser: writes through the Clipboard API", async () => {
    const writes: string[] = [];
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: (text: string) => {
          writes.push(text);
          return Promise.resolve();
        },
      },
    });
    await createBrowserClipboard().copy("0x8f3a");
    expect(writes).toEqual(["0x8f3a"]);
    vi.unstubAllGlobals();
  });

  it("browser: turns a refusal into a PortError", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: () => Promise.reject(new DOMException("no", "NotAllowedError")) },
    });
    await expect(createBrowserClipboard().copy("x")).rejects.toBeInstanceOf(PortError);
    vi.stubGlobal("navigator", {});
    await expect(createBrowserClipboard().copy("x")).rejects.toMatchObject({
      reason: "unavailable",
    });
    vi.unstubAllGlobals();
  });
});
