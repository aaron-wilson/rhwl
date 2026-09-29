import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createStore, resetAllStores, useStore } from "./store";

describe("createStore", () => {
  it("notifies subscribers on change and stops after unsubscribe", () => {
    const store = createStore(1);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.set(2);
    store.set((n) => n + 1);
    expect(store.get()).toBe(3);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    store.set(4);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("skips notification when the value is unchanged", () => {
    const store = createStore("a");
    const listener = vi.fn();
    store.subscribe(listener);
    store.set("a");
    expect(listener).not.toHaveBeenCalled();
  });

  it("resets one store or all stores to their initial values", () => {
    const a = createStore(0);
    const b = createStore<readonly string[]>([]);
    a.set(5);
    b.set(["x"]);
    a.reset();
    expect(a.get()).toBe(0);
    resetAllStores();
    expect(b.get()).toEqual([]);
  });
});

describe("useStore", () => {
  it("re-renders only when the selected slice changes", () => {
    const store = createStore({ count: 0, label: "x" });
    const renders = vi.fn();
    function Count() {
      renders();
      return <span>{useStore(store, (s) => s.count)}</span>;
    }
    render(<Count />);
    act(() => {
      store.set((s) => ({ ...s, label: "y" }));
    });
    expect(renders).toHaveBeenCalledTimes(1);
    act(() => {
      store.set((s) => ({ ...s, count: 1 }));
    });
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(renders).toHaveBeenCalledTimes(2);
  });
});
