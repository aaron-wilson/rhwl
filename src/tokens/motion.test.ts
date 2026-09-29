import { describe, expect, it } from "vitest";
import { bezier, tween } from "./motion";
import { easing } from "./scale";

describe("motion presets", () => {
  it.each(Object.entries(easing))("parses the %s easing token", (_name, token) => {
    expect(bezier(token)).toHaveLength(4);
  });

  it("converts duration tokens to seconds", () => {
    expect(tween("base", "exit")).toEqual({ duration: 0.2, ease: [0.4, 0, 1, 1] });
  });

  it("rejects anything that is not a cubic-bezier", () => {
    expect(() => bezier("ease-in")).toThrow(/cubic-bezier/);
  });
});
