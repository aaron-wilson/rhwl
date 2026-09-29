import { describe, expect, it } from "vitest";
import { amount } from "../money/amount";
import { signingAddress, signMessage, verifyMessage } from "../keys/signature";
import { decodeCard, encodeCard, readVerifyQuery, verifyQuery, type FlexCard } from "./card";

const card: FlexCard = {
  account: "main",
  accountName: "you.rh",
  assetId: "rh:CHIPDOG",
  symbol: "CHIPDOG",
  pnlBps: 4210n,
  pnlCents: 12_345_678n,
  entry: amount(190_000n, 8),
  mark: amount(270_000n, 8),
  at: new Date("2026-09-29T16:00:00.000Z"),
};

describe("flex card", () => {
  it("round-trips through its signed text", () => {
    expect(decodeCard(encodeCard(card))).toEqual(card);
  });

  it("leaves the dollar figure out when balances are hidden", () => {
    const hidden = { ...card, pnlCents: undefined };
    expect(encodeCard(hidden)).not.toContain("pnlCents");
    expect(decodeCard(encodeCard(hidden))).toEqual(hidden);
  });

  it("round-trips through a verify link, including non-ASCII names", () => {
    const text = encodeCard({ ...card, accountName: "Døgé 🚀" });
    const params = new URLSearchParams(verifyQuery(text, "0xabc"));
    expect(readVerifyQuery(params)).toEqual({ text, signature: "0xabc" });
  });

  it("verifies as signed, and fails once the P&L is edited", () => {
    const text = encodeCard(card);
    const signature = signMessage("main", text);
    expect(verifyMessage(text, signature, signingAddress("main"))).toBe(true);
    const tampered = text.replace('"pnlBps":"4210"', '"pnlBps":"9210"');
    expect(tampered).not.toBe(text);
    expect(verifyMessage(tampered, signature, signingAddress("main"))).toBe(false);
  });

  it.each([
    ["not JSON", "{"],
    ["another version", JSON.stringify({ v: 2 })],
    ["a non-numeric P&L", encodeCard(card).replace('"4210"', '"lots"')],
    ["a bad time", encodeCard(card).replace("2026-09-29T16:00:00.000Z", "yesterday")],
  ])("rejects %s", (_name, text) => {
    expect(decodeCard(text)).toBeUndefined();
  });

  it("rejects a link missing a part or with broken base64", () => {
    expect(readVerifyQuery(new URLSearchParams("card=abc"))).toBeUndefined();
    expect(readVerifyQuery(new URLSearchParams("card=%%%&sig=0x1"))).toBeUndefined();
  });
});
