import { afterEach, describe, expect, it, vi } from "vitest";
import { prefetchTabsWhenIdle } from "./routes";

describe("prefetchTabsWhenIdle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "connection");
  });

  it("waits for an idle moment and can be cancelled", () => {
    const idle = vi.fn(() => 7);
    const cancel = vi.fn();
    vi.stubGlobal("requestIdleCallback", idle);
    vi.stubGlobal("cancelIdleCallback", cancel);
    const stop = prefetchTabsWhenIdle();
    expect(idle).toHaveBeenCalledOnce();
    stop();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it.each([{ saveData: true }, { effectiveType: "2g" }, { effectiveType: "slow-2g" }])(
    "skips the warm-up when the connection is %o",
    (connection) => {
      const idle = vi.fn(() => 1);
      vi.stubGlobal("requestIdleCallback", idle);
      Object.defineProperty(navigator, "connection", { value: connection, configurable: true });
      prefetchTabsWhenIdle();
      expect(idle).not.toHaveBeenCalled();
    },
  );
});
