import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScoreMeter } from "./ScoreMeter";

const shown = () => Number(screen.getByTestId("security-score").textContent);

describe("ScoreMeter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts up to a raised score over the draw duration, and grows the bar", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    const { rerender } = render(<ScoreMeter score={30} />);
    expect(shown()).toBe(30);
    rerender(<ScoreMeter score={45} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(shown()).toBeGreaterThan(30);
    expect(shown()).toBeLessThan(45);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(shown()).toBe(45);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "45");
    const bar = screen.getByRole("meter").querySelector("[style]");
    expect(bar).toHaveStyle({ transform: "scaleX(0.45)" });
  });
});
