import { describe, expect, it } from "vitest";
import { destinations } from "../../app/destinations";
import { assetBySlug } from "../asset";
import { tourSteps } from "./steps";

describe("tour steps", () => {
  it("each go to a real page", () => {
    const pages = new Set(destinations.map((d) => d.path));
    for (const step of tourSteps) {
      const [, family = "", slug = ""] = /^\/(asset|rooms)\/(.+)$/.exec(step.path) ?? [];
      const ok = pages.has(step.path) || (family !== "" && assetBySlug(slug) !== undefined);
      expect(ok, step.path).toBe(true);
    }
  });

  it("each have a target, a title and a line to say", () => {
    for (const step of tourSteps) {
      expect(step.target.length).toBeGreaterThan(0);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(20);
    }
  });
});
