import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createBrowserVisibility } from "../../adapters/browser/visibility";
import { createDemoVisibility } from "../../adapters/demo/visibility";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { autoLockStore, lockedStore, startAutoLock } from "./lock";
import { LockGate } from "./LockGate";

function setup() {
  const providers = testProviders();
  const visibility = createDemoVisibility();
  const activity = new EventTarget();
  const stop = startAutoLock(providers.clock, visibility, activity);
  return { clock: providers.clock, visibility, activity, stop };
}

describe("auto-lock", () => {
  it("locks after five idle minutes by default", () => {
    const { clock, stop } = setup();
    clock.advance(299_000);
    expect(lockedStore.get()).toBe(false);
    clock.advance(1_000);
    expect(lockedStore.get()).toBe(true);
    stop();
  });

  it("restarts the timer on every tap or key press", () => {
    const { clock, activity, stop } = setup();
    clock.advance(240_000);
    activity.dispatchEvent(new Event("pointerdown"));
    clock.advance(240_000);
    expect(lockedStore.get()).toBe(false);
    stop();
  });

  it("locks on return from the background only if away at least the timeout", () => {
    const { clock, visibility, stop } = setup();
    autoLockStore.set("60000");
    visibility.setVisible(false);
    clock.advance(30_000);
    visibility.setVisible(true);
    expect(lockedStore.get()).toBe(false);
    visibility.setVisible(false);
    clock.advance(61_000);
    visibility.setVisible(true);
    expect(lockedStore.get()).toBe(true);
    stop();
  });

  it("never locks when set to Never", () => {
    const { clock, stop } = setup();
    autoLockStore.set("never");
    clock.advance(24 * 3_600_000);
    expect(lockedStore.get()).toBe(false);
    stop();
  });
});

describe("visibility adapters", () => {
  it.each([
    ["demo", createDemoVisibility],
    ["browser", createBrowserVisibility],
  ] as const)("%s starts visible and can be subscribed to", (_name, create) => {
    const visibility = create();
    expect(visibility.isVisible()).toBe(true);
    const off = visibility.subscribe(() => undefined);
    off();
  });
});

describe("lock gate", () => {
  it("replaces the app while locked and unlocks after the passkey scan", async () => {
    const providers = testProviders();
    render(
      <ProvidersContext.Provider value={providers}>
        <LockGate>
          <p>Balance $1,234.56</p>
        </LockGate>
      </ProvidersContext.Provider>,
    );
    act(() => {
      lockedStore.set(true);
    });
    expect(screen.queryByText(/\$1,234/)).toBeNull();
    expect(screen.getByRole("heading", { name: "Wallet locked" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Unlock with passkey" }));
    fireEvent(
      screen.getByTestId("unlock-scan"),
      new Event("webkitAnimationEnd", { bubbles: true }),
    );
    expect(screen.getByText("Balance $1,234.56")).toBeInTheDocument();
  });
});
