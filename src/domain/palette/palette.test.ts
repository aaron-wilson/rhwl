import { describe, expect, it } from "vitest";
import { parseAction } from "./actions";
import { score, search, type Command } from "./search";

const ids: Record<string, string> = { usdg: "rh:USDG", eth: "rh:ETH", nvda: "rh:NVDA" };
const lookup = (symbol: string) => ids[symbol];

const cmd = (id: string, title: string, keywords = ""): Command => ({
  id,
  title,
  group: "Page",
  keywords,
  run: { kind: "go", to: `/${id}` },
});

describe("palette search", () => {
  const commands = [
    cmd("swap", "Swap", "exchange convert"),
    cmd("send", "Send", "pay transfer"),
    cmd("settings", "Settings", "preferences"),
    cmd("earn", "Earn", "vault yield"),
    cmd("earnings", "Earnings calendar", "reports"),
  ];

  it("ranks a title start above a keyword", () => {
    expect(search(commands, "se").map((c) => c.id)).toEqual(["send", "settings"]);
    expect(search(commands, "pay").map((c) => c.id)).toEqual(["send"]);
  });

  it("needs every word to match", () => {
    expect(search(commands, "earnings cal").map((c) => c.id)).toEqual(["earnings"]);
    expect(search(commands, "earn vault").map((c) => c.id)).toEqual(["earn"]);
    expect(score(commands[0] ?? cmd("x", "x"), "swap nothing")).toBe(0);
  });

  it("lists everything for an empty query, in order, up to the limit", () => {
    expect(search(commands, "  ", 3).map((c) => c.id)).toEqual(["swap", "send", "settings"]);
  });
});

describe("palette actions", () => {
  it("prefills a send", () => {
    expect(parseAction("send 20 USDG to you.rh", lookup)).toEqual({
      title: "Send 20 USDG to you.rh",
      to: "/send?to=you.rh&asset=rh%3AUSDG&amount=20",
    });
    expect(parseAction("  Send $2.5 eth to 0xabc  ", lookup)?.to).toBe(
      "/send?to=0xabc&asset=rh%3AETH&amount=2.5",
    );
  });

  it("prefills a swap and opens a trade", () => {
    expect(parseAction("swap eth for usdg", lookup)?.to).toBe("/swap?from=rh%3AETH&to=rh%3AUSDG");
    expect(parseAction("swap eth to usdg", lookup)?.title).toBe("Swap ETH for USDG");
    expect(parseAction("buy nvda", lookup)).toEqual({ title: "Trade NVDA", to: "/asset/rh-NVDA" });
  });

  it.each([
    "send 20 DOGE to you.rh",
    "send twenty usdg to you.rh",
    "swap eth for eth",
    "buy",
    "hello",
  ])("finds no action in %j", (query) => {
    expect(parseAction(query, lookup)).toBeUndefined();
  });
});
