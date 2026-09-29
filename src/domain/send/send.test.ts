import { describe, expect, it } from "vitest";
import { addressForName, nameForAddress } from "../../data/directory";
import { amount, parseAmount, toDecimalString, type Amount } from "../money/amount";
import { maxSendable, parseSendAmount, sendProblem } from "./amount";
import { lookalikeOf, resolveRecipient } from "./recipient";

const STONKS = "0x7a2c9e41b0d35f86a2c417e9d0b3a8f6c21e3f19";
// The same address in EIP-55 checksummed form, as resolution returns it.
const STONKS_CHECKSUMMED = "0x7a2c9e41b0D35F86A2c417e9D0b3a8F6C21E3F19";
const resolve = (input: string) => resolveRecipient(input, addressForName, nameForAddress);

describe("resolveRecipient", () => {
  it.each([
    ["", { status: "empty" }],
    ["   ", { status: "empty" }],
    [STONKS, { status: "ok", address: STONKS_CHECKSUMMED, name: "stonks.rh" }],
    [`  ${STONKS}  `, { status: "ok", address: STONKS_CHECKSUMMED, name: "stonks.rh" }],
    [
      "0X44B1D09C7E3FA2B6581C0D4E9F7A3B2C16D59E0D",
      { status: "ok", address: "0x44B1D09C7e3Fa2b6581C0d4e9f7a3b2c16d59E0D", name: undefined },
    ],
    ["stonks.rh", { status: "ok", address: STONKS_CHECKSUMMED, name: "stonks.rh" }],
    ["Stonks", { status: "ok", address: STONKS_CHECKSUMMED, name: "stonks.rh" }],
    [
      "yolo.eth",
      { status: "ok", address: "0x9C4e1a7B3d5F0e8c2b6a4D9f1e3C7B5A0d8e62f4", name: "yolo.eth" },
    ],
    ["nobody.rh", { status: "invalid", reason: "Nobody uses nobody.rh" }],
    ["nobody", { status: "invalid", reason: "Nobody uses nobody.rh" }],
    ["0x7a2c", { status: "invalid", reason: "An address is 0x and 40 characters; this has 4" }],
    [
      `${STONKS}0`,
      { status: "invalid", reason: "An address is 0x and 40 characters; this has 41" },
    ],
    [STONKS_CHECKSUMMED, { status: "ok", address: STONKS_CHECKSUMMED, name: "stonks.rh" }],
    [
      // One letter's case flipped from the checksummed form.
      "0x7a2c9e41b0D35F86A2c417e9D0b3a8F6C21E3f19",
      {
        status: "invalid",
        reason:
          "The capital letters don't match this address's checksum, so a character is likely wrong",
      },
    ],
    [
      "0x7a2c9e41b0d35f86a2c417e9d0b3a8f6c21e3fZZ",
      { status: "invalid", reason: "An address has only 0–9 and a–f after 0x" },
    ],
    [
      "7Hq3uWzv9KpX4mN2dRe8sTyB5cLgA1fJoV6iQkZ3wYxP",
      {
        status: "invalid",
        reason: "That looks like a Solana address. This sends on Robinhood Chain.",
      },
    ],
    [
      "send to bob",
      { status: "invalid", reason: "Enter an address (0x…) or a name like stonks.rh" },
    ],
  ] as const)("%j", (input, expected) => {
    expect(resolve(input)).toEqual(expected);
  });
});

describe("lookalikeOf", () => {
  const known = [{ address: STONKS, label: "stonks.rh" }];

  it("flags an address with the same first and last characters", () => {
    expect(lookalikeOf("0x7a2c5b0e8d1f4a9c6e2b7d03f5a8c1e9b4d23f19", known)).toEqual(known[0]);
  });

  it("ignores case", () => {
    expect(lookalikeOf("0x7A2C5B0E8D1F4A9C6E2B7D03F5A8C1E9B4D23F19", known)).toEqual(known[0]);
  });

  it("does not flag the real address, however it is cased", () => {
    expect(lookalikeOf(STONKS.toUpperCase().replace("0X", "0x"), known)).toBeUndefined();
  });

  it.each([
    ["different start", "0x7b2c5b0e8d1f4a9c6e2b7d03f5a8c1e9b4d23f19"],
    ["different end", "0x7a2c5b0e8d1f4a9c6e2b7d03f5a8c1e9b4d23f18"],
  ])("does not flag a %s", (_, address) => {
    expect(lookalikeOf(address, known)).toBeUndefined();
  });
});

const q = (text: string, decimals: number): Amount => parseAmount(text, decimals) ?? amount(0n, 0);
const usd = (text: string) => q(text, 8);
const text = (value: Amount | undefined) =>
  value === undefined ? undefined : toDecimalString(value);

describe("parseSendAmount", () => {
  it.each([
    ["25", "token", 6, "1", "25.000000"],
    ["0.5", "token", 18, "3000", "0.500000000000000000"],
    ["0", "token", 6, "1", undefined],
    ["abc", "token", 6, "1", undefined],
    ["0.0000001", "token", 6, "1", undefined],
    ["100", "usd", 18, "3200", "0.031250000000000000"],
    ["$100", "usd", 6, "1", "100.000000"],
    ["10", "usd", 6, "0.99990001", "10.000999"],
    ["1.001", "usd", 6, "1", undefined],
    ["0", "usd", 6, "1", undefined],
  ] as const)("%j %s (%d decimals at $%s) → %s", (input, unit, decimals, price, expected) => {
    expect(text(parseSendAmount(input, unit, decimals, usd(price)))).toBe(expected);
  });
});

describe("maxSendable", () => {
  it("keeps the fee back when it is paid in the same token", () => {
    expect(text(maxSendable(q("1.2", 18), q("0.000004", 18)))).toBe("1.199996000000000000");
  });

  it("sends everything of another token", () => {
    expect(text(maxSendable(q("8120", 6), undefined))).toBe("8120.000000");
  });

  it("never goes below zero", () => {
    expect(text(maxSendable(q("0.000001", 18), q("0.000004", 18)))).toBe("0.000000000000000000");
  });
});

describe("sendProblem", () => {
  const fee = q("0.000004", 18);
  const base = { fee, gasBalance: q("1", 18), sendingGasToken: false };

  it("passes a send within the balance", () => {
    expect(sendProblem({ ...base, amount: q("10", 6), balance: q("10", 6) })).toBeUndefined();
  });

  it("flags more than the balance", () => {
    expect(sendProblem({ ...base, amount: q("10.01", 6), balance: q("10", 6) })).toBe(
      "insufficient",
    );
  });

  it("flags a missing fee", () => {
    expect(
      sendProblem({ ...base, amount: q("1", 6), balance: q("10", 6), gasBalance: q("0", 18) }),
    ).toBe("fee");
  });

  it("counts the fee against the balance when sending the gas token", () => {
    const eth = { ...base, sendingGasToken: true, gasBalance: q("1", 18), balance: q("1", 18) };
    expect(sendProblem({ ...eth, amount: q("1", 18) })).toBe("insufficient");
    expect(sendProblem({ ...eth, amount: q("0.999996", 18) })).toBeUndefined();
  });
});
