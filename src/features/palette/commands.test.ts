import { describe, expect, it } from "vitest";
import { shellPagePaths } from "../../app/router";
import { navRoutes } from "../../app/routes";
import { displayCurrencyStore } from "../../domain/money/display";
import { allCommands, assetIdForSymbol } from "./commands";

const targets = () =>
  allCommands().flatMap((c) => (c.run.kind === "set" ? [] : [c.run.to.split("?")[0] ?? ""]));

describe("palette commands", () => {
  it("reach every page without a parameter", () => {
    const reachable = new Set(targets());
    const pages = [
      ...navRoutes.map((r) => r.path),
      ...shellPagePaths.filter((p) => p !== "*" && !p.includes(":")).map((p) => `/${p}`),
      "/styleguide",
    ];
    expect(pages.filter((p) => !reachable.has(p))).toEqual([]);
  });

  it("reach at least one page of every route with a parameter", () => {
    const families = shellPagePaths
      .filter((p) => p.includes(":"))
      .map((p) => `/${p.split("/:")[0] ?? ""}/`);
    const all = targets();
    expect(families.filter((prefix) => !all.some((t) => t.startsWith(prefix)))).toEqual([]);
  });

  it("have unique ids", () => {
    const ids = allCommands().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("change settings in place", () => {
    const euros = allCommands().find((c) => c.id === "currency:EUR");
    if (euros?.run.kind !== "set") throw new Error("missing");
    euros.run.apply();
    expect(displayCurrencyStore.get()).toBe("EUR");
  });

  it("read a symbol as the Robinhood Chain asset first", () => {
    expect(assetIdForSymbol("usdg")).toBe("rh:USDG");
    expect(assetIdForSymbol("nvda")).toBe("rh:NVDA");
    expect(assetIdForSymbol("nope")).toBeUndefined();
  });
});
