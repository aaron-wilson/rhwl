import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { frameOf, indexAt, linePath, xAt, yAt } from "./geometry";
import { LineChart } from "./LineChart";

describe("chart geometry", () => {
  it("pads the frame so the line never touches the edges", () => {
    const frame = frameOf([10, 20]);
    expect(frame.min).toBeLessThan(10);
    expect(frame.max).toBeGreaterThan(20);
  });

  it("includes the baseline in the frame", () => {
    expect(frameOf([10, 20], 5).min).toBeLessThan(5);
  });

  it("handles a flat series without dividing by zero", () => {
    const frame = frameOf([7, 7, 7]);
    expect(Number.isFinite(yAt(7, frame, 100))).toBe(true);
  });

  it("maps first and last points to the edges and higher values upward", () => {
    const frame = { min: 0, max: 10 };
    expect(xAt(0, 5)).toBe(0);
    expect(xAt(4, 5)).toBe(1000);
    expect(yAt(10, frame, 100)).toBe(0);
    expect(yAt(0, frame, 100)).toBe(100);
    expect(linePath([0, 10], frame, 100)).toBe("M0.00,100.00L1000.00,0.00");
  });

  it.each([
    [0, 0],
    [0.5, 50],
    [1, 100],
    [-0.2, 0],
    [1.4, 100],
  ])("fraction %s picks index %s of 101", (fraction, index) => {
    expect(indexAt(fraction, 101)).toBe(index);
  });
});

describe("LineChart", () => {
  function Harness() {
    const [active, setActive] = useState<number | undefined>(undefined);
    return (
      <LineChart
        values={[1, 3, 2, 5, 4]}
        active={active}
        onActiveChange={setActive}
        label="Portfolio"
        describe={(i) => `point ${i}`}
      />
    );
  }

  it("scrubs with arrows, Shift, Home and End, and clears on Escape", async () => {
    render(<Harness />);
    const chart = screen.getByRole("slider", { name: "Portfolio" });
    expect(chart).toHaveAttribute("aria-valuetext", "point 4");
    chart.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(chart).toHaveAttribute("aria-valuenow", "3");
    await userEvent.keyboard("{Home}");
    expect(chart).toHaveAttribute("aria-valuetext", "point 0");
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(chart).toHaveAttribute("aria-valuenow", "4");
    await userEvent.keyboard("{ArrowLeft}{Escape}");
    expect(chart).toHaveAttribute("aria-valuenow", "4");
  });
});
