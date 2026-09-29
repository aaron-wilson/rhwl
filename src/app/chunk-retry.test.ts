import { describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "../adapters/demo/storage";
import type { Clock } from "../ports/clock";
import { createChunkLoader, RELOAD_MARK, RETRY_DELAY_MS } from "./chunk-retry";

function setup(mark = false) {
  const delays: number[] = [];
  const clock: Clock = {
    now: () => new Date("2026-10-02T15:00:00Z"),
    schedule: (fn, ms) => {
      delays.push(ms);
      fn();
      return () => undefined;
    },
  };
  const storage = createMemoryStorage();
  if (mark) storage.set(RELOAD_MARK, "1");
  const reload = vi.fn();
  const loadChunk = createChunkLoader({
    clock: () => clock,
    sessionStorage: () => storage,
    reload,
  });
  return { delays, storage, reload, loadChunk };
}

const failing = (times: number) => {
  let calls = 0;
  return vi.fn(() => {
    calls += 1;
    return calls <= times
      ? Promise.reject(new TypeError("Failed to fetch dynamically imported module"))
      : Promise.resolve("Page");
  });
};

describe("chunk loader", () => {
  it("retries once after 500 ms of clock time and clears the mark", async () => {
    const { delays, storage, reload, loadChunk } = setup(true);
    const load = failing(1);
    await expect(loadChunk(load)).resolves.toBe("Page");
    expect(load).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([RETRY_DELAY_MS]);
    expect(reload).not.toHaveBeenCalled();
    expect(storage.get(RELOAD_MARK)).toBeUndefined();
  });

  it("reloads once, setting the mark, when both tries fail", async () => {
    const { storage, reload, loadChunk } = setup();
    void loadChunk(failing(2));
    await vi.waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(1);
    });
    expect(storage.get(RELOAD_MARK)).toBe("1");
  });

  it("throws for the boundary when the mark shows it already reloaded", async () => {
    const { reload, loadChunk } = setup(true);
    await expect(loadChunk(failing(2))).rejects.toThrow("dynamically imported module");
    expect(reload).not.toHaveBeenCalled();
  });
});
