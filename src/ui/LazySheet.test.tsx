import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LazySheet } from "./LazySheet";

describe("LazySheet", () => {
  it("renders nothing until opened, then the sheet", async () => {
    const close = () => undefined;
    const { rerender } = render(
      <LazySheet open={false} onClose={close} title="Later">
        body
      </LazySheet>,
    );
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    rerender(
      <LazySheet open onClose={close} title="Later">
        body
      </LazySheet>,
    );
    expect(await screen.findByRole("dialog", { name: "Later" })).toBeInTheDocument();
  });
});
