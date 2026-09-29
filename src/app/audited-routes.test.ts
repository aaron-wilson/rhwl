import { describe, expect, it } from "vitest";
import { auditedRoutes } from "../../e2e/routes";
import { shellPagePaths } from "./router";
import { navRoutes } from "./routes";

describe("the axe audit's route list", () => {
  it("has a URL for every route the router knows", () => {
    const known = [
      ...navRoutes.map((route) => (route.path === "/" ? "/" : route.path.slice(1))),
      ...shellPagePaths,
      "/welcome",
      "/styleguide",
    ];
    const audited = auditedRoutes.map((entry) => entry.route);
    expect(known.filter((route) => !audited.includes(route))).toEqual([]);
    expect(audited.filter((route) => !known.includes(route))).toEqual([]);
  });
});
