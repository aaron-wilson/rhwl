import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { boundaryRules } from "./boundary-rules.js";

const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: boundaryRules });

async function violations(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.ruleId === "no-restricted-imports").length;
}

describe("adapter boundary", () => {
  it.each([
    [
      "feature importing a demo adapter",
      `import { createDemoClock } from "../../adapters/demo/clock";`,
      "src/features/home/HomePage.tsx",
    ],
    [
      "ui importing a browser adapter",
      `import { createBrowserShare } from "../adapters/browser/share";`,
      "src/ui/Share.tsx",
    ],
    ["app code importing full zod", `import { z } from "zod";`, "src/app/persistence.ts"],
  ])("rejects %s", async (_name, code, path) => {
    expect(await violations(code, path)).toBe(1);
  });

  it.each([
    [
      "the composition root",
      `import { createDemoClock } from "../adapters/demo/clock";`,
      "src/app/composition.ts",
    ],
    [
      "a test",
      `import { createDemoClock } from "../adapters/demo/clock";`,
      "src/ports/contracts.test.ts",
    ],
    [
      "port types in a feature",
      `import type { Clock } from "../../ports/clock";`,
      "src/features/home/HomePage.tsx",
    ],
    ["zod/mini in app code", `import * as z from "zod/mini";`, "src/app/persistence.ts"],
  ])("allows %s", async (_name, code, path) => {
    expect(await violations(code, path)).toBe(0);
  });
});

describe("feature boundary", () => {
  it.each([
    [`import { accountsStore } from "../accounts/store";`],
    [`import { runTransaction } from "../transactions/run-transaction";`],
    [`import { usePosition } from "../asset/usePosition";`],
  ])("rejects %s", async (code) => {
    expect(await violations(code, "src/features/send/SendPage.tsx")).toBe(1);
  });

  it.each([
    ["a sibling's index", `import { useAccounts } from "../accounts";`],
    ["a sibling's actions", `import { runTransaction } from "../transactions/actions";`],
    ["its own files", `import { draftStore } from "./draft-store";`],
    ["shared layers", `import { Button } from "../../ui/Button";`],
  ])("allows %s", async (_name, code) => {
    expect(await violations(code, "src/features/send/SendPage.tsx")).toBe(0);
  });

  it("leaves tests and code outside features alone", async () => {
    const deep = `import { accountsStore } from "../accounts/accounts-store";`;
    expect(await violations(deep, "src/features/send/send.test.tsx")).toBe(0);
    expect(
      await violations(
        `import { x } from "../features/accounts/accounts-store";`,
        "src/app/App.tsx",
      ),
    ).toBe(0);
  });
});
