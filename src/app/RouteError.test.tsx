import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { testProviders } from "../test/providers";
import { App } from "./App";
import { createSession } from "./session";

vi.mock("../features/earn/EarnPage", () => ({
  EarnPage: () => {
    throw new Error("earn broke");
  },
}));

describe("RouteError", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("replaces a page that throws and keeps the shell", async () => {
    window.history.replaceState(null, "", "/earn");
    const providers = testProviders();
    render(<App session={createSession(() => providers)} />);
    expect(await screen.findByRole("heading", { name: "This page didn't load" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("navigation", { name: "Primary" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("earn broke")).toBeNull();
    // The report is sent from an effect, which can run after the boundary first paints.
    await waitFor(() => {
      expect(providers.reporter.reported.map((r) => r.where)).toContain("route");
    });
  });
});
