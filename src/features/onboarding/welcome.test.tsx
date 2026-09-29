import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { claimedNameStore, needsOnboardingStore, onboardingStore } from "./onboarding-store";
import { useNameAvailability } from "./useNameAvailability";
import { WelcomePage } from "./WelcomePage";

describe("useNameAvailability", () => {
  function setup(initial: string) {
    const providers = testProviders();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ProvidersContext.Provider value={providers}>{children}</ProvidersContext.Provider>
    );
    const hook = renderHook(({ input }) => useNameAvailability(input), {
      wrapper,
      initialProps: { input: initial },
    });
    return { ...hook, clock: providers.clock };
  }

  it("rejects invalid names at once, without a lookup", () => {
    expect(setup("a!").result.current).toEqual({
      state: "invalid",
      reason: "Use at least 3 characters",
    });
  });

  it("waits for a pause, looks the name up, then reports it available", () => {
    const { result, clock } = setup("moonboy");
    expect(result.current.state).toBe("idle");
    act(() => {
      clock.advance(300);
    });
    expect(result.current.state).toBe("checking");
    act(() => {
      clock.advance(250);
    });
    expect(result.current).toEqual({ state: "available", name: "moonboy" });
  });

  it("suggests a free variant of a taken name", () => {
    const { result, clock } = setup("stonks");
    act(() => {
      clock.advance(600);
    });
    expect(result.current).toEqual({ state: "taken", suggestion: "stonks2" });
  });

  it("starts over when the input changes mid-check", () => {
    const { result, rerender, clock } = setup("moonboy");
    act(() => {
      clock.advance(400);
    });
    rerender({ input: "moongirl" });
    act(() => {
      clock.advance(200);
    });
    expect(result.current.state).not.toBe("available");
    act(() => {
      clock.advance(600);
    });
    expect(result.current).toEqual({ state: "available", name: "moongirl" });
  });
});

// jsdom has no AnimationEvent, so React listens for the webkit-prefixed name there.
function endAnimation(element: HTMLElement) {
  fireEvent(element, new Event("webkitAnimationEnd", { bubbles: true }));
}

describe("welcome flow", () => {
  it("creates a passkey, claims a name, picks a region and lands on Home", async () => {
    const providers = testProviders();
    needsOnboardingStore.set(true);
    const router = createMemoryRouter(
      [
        { path: "/welcome", element: <WelcomePage /> },
        { path: "/", element: <p>Home</p> },
      ],
      { initialEntries: ["/welcome"] },
    );
    render(
      <ProvidersContext.Provider value={providers}>
        <RouterProvider router={router} />
      </ProvidersContext.Provider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Create a wallet" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue with passkey" }));
    await userEvent.click(screen.getByRole("button", { name: "Create passkey" }));
    endAnimation(screen.getByTestId("passkey-scan"));
    expect(screen.getByText("Passkey created")).toBeInTheDocument();
    endAnimation(screen.getByTestId("passkey-done"));
    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "moonboy");
    act(() => {
      providers.clock.advance(600);
    });
    expect(screen.getByText("moonboy.rh is yours to claim")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByText("United States"));
    expect(screen.getByText(/aren't offered to US persons/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(onboardingStore.get()).toMatchObject({ step: "done", name: "moonboy", region: "US" });
    expect(claimedNameStore.get()).toBe("moonboy");
    expect(needsOnboardingStore.get()).toBe(false);
  });
});
