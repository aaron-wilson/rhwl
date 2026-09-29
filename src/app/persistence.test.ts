import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../adapters/demo/storage";
import { balancesHiddenStore } from "../features/privacy/privacy";
import { hydrate, SNAPSHOT_KEY } from "./persistence";
import { themeStore } from "./theme";

describe("persistence", () => {
  it("restores a valid snapshot and saves every later change", () => {
    const storage = createMemoryStorage();
    storage.set(SNAPSHOT_KEY, JSON.stringify({ version: 1, theme: "dark", balancesHidden: true }));
    const stop = hydrate(storage);
    expect(themeStore.get()).toBe("dark");
    expect(balancesHiddenStore.get()).toBe(true);
    themeStore.set("light");
    expect(JSON.parse(storage.get(SNAPSHOT_KEY) ?? "{}")).toEqual({
      version: 1,
      theme: "light",
      balancesHidden: true,
    });
    stop();
  });

  it.each([
    "not json",
    JSON.stringify({ version: 2, theme: "dark", balancesHidden: true }),
    JSON.stringify({ version: 1, theme: "neon", balancesHidden: false }),
  ])("ignores an unusable snapshot: %s", (raw) => {
    const storage = createMemoryStorage();
    storage.set(SNAPSHOT_KEY, raw);
    const stop = hydrate(storage);
    expect(themeStore.get()).toBe("system");
    expect(balancesHiddenStore.get()).toBe(false);
    stop();
  });
});
