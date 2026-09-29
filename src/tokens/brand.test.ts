import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { color } from "./color";

// These files must hard-code colors (browsers read them before any CSS loads),
// so this test keeps them in step with the tokens.
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8").toUpperCase();

describe("brand colors outside CSS match the tokens", () => {
  it("index.html theme-color follows the canvas in each scheme", () => {
    const html = read("index.html");
    expect(html).toContain(`CONTENT="${color.canvas.light}" MEDIA="(PREFERS-COLOR-SCHEME: LIGHT)"`);
    expect(html).toContain(`CONTENT="${color.canvas.dark}" MEDIA="(PREFERS-COLOR-SCHEME: DARK)"`);
  });

  it("the web manifest uses the dark canvas", () => {
    const manifest = read("public/site.webmanifest");
    expect(manifest).toContain(`"BACKGROUND_COLOR": "${color.canvas.dark}"`);
    expect(manifest).toContain(`"THEME_COLOR": "${color.canvas.dark}"`);
  });

  it.each(["brand/mark.svg", "brand/mark-full-bleed.svg", "public/favicon.svg"])(
    "%s uses the ink tile and the dark gain line",
    (path) => {
      const svg = read(path);
      expect(svg).toContain(color.ink.light.toUpperCase());
      expect(svg).toContain(color.gain.dark.toUpperCase());
    },
  );
});
