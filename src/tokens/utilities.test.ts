import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { space } from "./scale";

// Without Tailwind's default theme, a spacing step outside the scale generates
// no CSS at all, so a typo like h-9 fails silently. This catches it.
const SPACING =
  /(?<![\w-])-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|w|h|size|min-w|min-h|max-w|max-h|top|bottom|left|right|inset|inset-x|inset-y|space-x|space-y|translate-x|translate-y|basis)-(\d+(?:\.\d+)?)(?![\w.-])/g;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx$/.test(name) && !name.endsWith(".test.tsx") ? [path] : [];
  });
}

describe("spacing utilities", () => {
  it("use only steps from the spacing scale", () => {
    const steps = new Set(Object.keys(space));
    const unknown = sources("src").flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(SPACING)]
        .filter((match) => !steps.has(match[1] ?? ""))
        .map((match) => `${file}: ${match[0]}`),
    );
    expect(unknown).toEqual([]);
  });
});
