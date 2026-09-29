import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Card } from "./Card";
import { Button } from "./Button";
import { monogram, splashFor } from "./identity";
import { SegmentedControl } from "./SegmentedControl";
import { Sheet } from "./Sheet";
import { Slider } from "./Slider";
import { Switch } from "./Switch";
import { Tabs } from "./Tabs";
import { showToast, useToasts } from "./toast";
import { testProviders } from "../test/providers";
import { Toaster } from "./Toaster";

describe("Button", () => {
  it("is disabled and busy while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Sign
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Sign" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Switch", () => {
  it("toggles with the keyboard", async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return <Switch label="Guardrails" checked={on} onChange={setOn} />;
    }
    render(<Harness />);
    const toggle = screen.getByRole("switch", { name: /Guardrails/ });
    toggle.focus();
    await userEvent.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});

describe("Slider", () => {
  function Harness() {
    const [value, setValue] = useState(5);
    return (
      <Slider
        label="Leverage"
        value={value}
        min={1}
        max={20}
        onChange={setValue}
        format={(v) => `${v}x`}
      />
    );
  }

  it.each([
    ["{ArrowRight}", "6"],
    ["{ArrowLeft}", "4"],
    ["{PageUp}", "15"],
    ["{PageDown}", "1"],
    ["{Home}", "1"],
    ["{End}", "20"],
  ])("%s moves to %s", async (key, expected) => {
    render(<Harness />);
    const slider = screen.getByRole("slider", { name: "Leverage" });
    slider.focus();
    await userEvent.keyboard(key);
    expect(slider).toHaveAttribute("aria-valuenow", expected);
    expect(slider).toHaveAttribute("aria-valuetext", `${expected}x`);
  });
});

describe("Tabs", () => {
  it("moves selection and focus with arrows, Home and End", async () => {
    function Harness() {
      const [value, setValue] = useState<"a" | "b" | "c">("a");
      return (
        <Tabs
          label="Sections"
          tabs={[
            { value: "a", label: "Tokens" },
            { value: "b", label: "Stocks" },
            { value: "c", label: "Activity" },
          ]}
          value={value}
          onChange={setValue}
        />
      );
    }
    render(<Harness />);
    screen.getByRole("tab", { name: "Tokens" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Stocks" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Stocks" })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Activity" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Tokens" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Stocks" })).toHaveAttribute("tabindex", "-1");
  });
});

describe("SegmentedControl", () => {
  it("changes value when an option is chosen", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Range"
        options={[
          { value: "1D", label: "1D" },
          { value: "1W", label: "1W" },
        ]}
        value="1D"
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "1W" }));
    expect(onChange).toHaveBeenCalledWith("1W");
  });
});

describe("Sheet", () => {
  it("opens as a labelled dialog and asks to close on Escape and the close button", async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Review swap">
        <p>Body</p>
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog", { name: "Review swap" });
    expect(dialog).toHaveAttribute("open");
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("Toaster", () => {
  it("announces toasts, keeps three, and dismisses them on the app clock", () => {
    const { clock } = testProviders();
    render(<Toaster clock={clock} />);
    const store = renderHook(() => useToasts());
    act(() => {
      ["One", "Two", "Three", "Four"].forEach((message) => showToast(message));
    });
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Four");
    expect(region).not.toHaveTextContent("One");
    act(() => {
      clock.advance(3000);
    });
    expect(store.result.current).toHaveLength(3);
    act(() => {
      clock.advance(300);
    });
    expect(store.result.current).toHaveLength(0);
  });
});

describe("identity", () => {
  it("derives stable monograms and colors", () => {
    expect(monogram("$CHIPDOG")).toBe("C");
    expect(monogram("you.rh")).toBe("Y");
    expect(splashFor("NVDA")).toBe(splashFor("NVDA"));
  });
});

describe("Card", () => {
  it.each([
    ["normal", "p-4"],
    ["list", "p-1"],
  ] as const)("pads %s cards with %s and nothing else", (padding, expected) => {
    render(<Card padding={padding}>Body</Card>);
    const classes = screen.getByText("Body").className.split(" ");
    expect(classes.filter((c) => /^p-\d/.test(c))).toEqual([expected]);
  });

  it("leaves padding to the child when asked", () => {
    render(<Card padding="none">Body</Card>);
    expect(screen.getByText("Body").className).not.toMatch(/\bp-\d/);
  });
});
