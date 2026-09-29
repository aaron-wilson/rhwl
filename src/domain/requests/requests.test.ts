import { describe, expect, it } from "vitest";
import { dapps } from "../../data/dapps";
import { UNVERIFIED_CONTRACT } from "../../data/contracts";
import { testProviders } from "../../test/providers";
import { amount } from "../money/amount";
import { decodeCall } from "./calldata";
import { decodeIntent, intentRequest, intentSummary } from "./intent";
import { parseDappRequest, type DappRequest } from "./request";
import { phishingFinding, requestFindings } from "./risk";

const USDG = "0x5d6e000000000000000000000000000000000a01";
const ROUTER = "0x1111000000000000000000000000000000000001";
const DRAINER = "0xdead0000000000000000000000000000000beef1";
const MAX = "f".repeat(64);
const pad = (hex: string) => hex.replace(/^0x/, "").padStart(64, "0");
const approve = (spender: string, value: string) => `0x095ea7b3${pad(spender)}${value}`;
const known = dapps.filter((d) => d.listed).map((d) => d.origin);
const fee = { assetId: "rh:ETH", quantity: amount(-1_000_000_000_000n, 18) };

const tx = (to: string, data = "0x", value = "0x0", origin = "hoodswap.app"): DappRequest => ({
  method: "eth_sendTransaction",
  origin,
  tx: { to, data, value },
});

/** Decodes a request, dry-runs it on the demo chain when it is a transaction, and collects findings. */
function findingsFor(request: DappRequest) {
  const intent = decodeIntent(request);
  const txRequest = intentRequest(intent, fee);
  const simulated =
    txRequest === undefined ? [] : testProviders().simulation.simulate("main", txRequest).findings;
  return requestFindings(request.origin, known, intent, simulated).map((f) => f.id);
}

describe("request schema", () => {
  it.each([
    [{ method: "eth_sendTransaction", origin: "x", tx: { to: "0x12" } }],
    [{ method: "eth_sign", origin: "x", message: "hi" }],
    [{ method: "personal_sign", message: "hi" }],
    ["not a request"],
  ])("refuses the malformed %j", (raw) => {
    expect(parseDappRequest(raw)).toBeUndefined();
  });

  it("fills in empty data and zero value", () => {
    expect(
      parseDappRequest({ method: "eth_sendTransaction", origin: "x", tx: { to: ROUTER } }),
    ).toEqual(tx(ROUTER, "0x", "0x0", "x"));
  });
});

describe("calldata", () => {
  it("decodes approve, transfer and setApprovalForAll", () => {
    expect(decodeCall(approve(ROUTER, pad("0x64")))).toEqual({
      name: "approve",
      spender: ROUTER,
      value: 100n,
    });
    expect(decodeCall(`0xa9059cbb${pad(DRAINER)}${pad("0x1")}`)).toEqual({
      name: "transfer",
      to: DRAINER,
      value: 1n,
    });
    expect(decodeCall(`0xa22cb465${pad(ROUTER)}${pad("0x1")}`)).toMatchObject({ approved: true });
  });

  it.each(["0x", "0x12345678", `0x095ea7b3${pad(ROUTER)}`])("leaves %s unknown", (data) => {
    expect(decodeCall(data).name).toBe("unknown");
  });
});

describe("intents", () => {
  it("reads an unlimited USDG approval without its amount in the words", () => {
    const intent = decodeIntent(tx(USDG, approve(ROUTER, MAX)));
    expect(intent).toMatchObject({ kind: "approve", token: USDG, allowance: "unlimited" });
    expect(intentSummary(intent)).toEqual({
      verb: "Allow unlimited USDG spending",
      detail: "by 0x1111…0001",
    });
  });

  it("keeps a transfer's amount as data for privacy masking", () => {
    const intent = decodeIntent(tx(USDG, `0xa9059cbb${pad(ROUTER)}${pad("0xf4240")}`));
    expect(intentSummary(intent).primary).toEqual({
      assetId: "rh:USDG",
      quantity: amount(-1_000_000n, 6),
    });
  });

  it("reads plain ETH, an unknown call, text and blind messages, and typed data", () => {
    expect(decodeIntent(tx(ROUTER, "0x", "0xde0b6b3a7640000")).kind).toBe("transfer");
    expect(decodeIntent(tx(ROUTER, "0xdeadbeef")).kind).toBe("call");
    expect(decodeIntent({ method: "personal_sign", origin: "x", message: "0x68656c6c6f" })).toEqual(
      { kind: "message", text: "hello", blind: false },
    );
    expect(
      decodeIntent({ method: "personal_sign", origin: "x", message: `0x${"ab".repeat(32)}` }),
    ).toMatchObject({ blind: true });
    const order = { domain: { name: "Curvefront" }, primaryType: "Order", message: {} };
    expect(decodeIntent({ method: "eth_signTypedData_v4", origin: "x", typedData: order })).toEqual(
      { kind: "typed", primaryType: "Order", contract: undefined },
    );
  });
});

describe("risk findings, one seeded request each", () => {
  it("unlimited approval, through the dry run", () => {
    expect(findingsFor(tx(USDG, approve(ROUTER, MAX)))).toEqual(["unlimited-approval"]);
  });

  it("unlimited approval, by Permit signature", () => {
    const permit = {
      domain: { name: "USDG", verifyingContract: ROUTER },
      primaryType: "Permit",
      message: { spender: ROUTER, value: `0x${MAX}` },
    };
    expect(
      findingsFor({ method: "eth_signTypedData_v4", origin: "hoodswap.app", typedData: permit }),
    ).toEqual(["unlimited-approval"]);
  });

  it("unverified contract, through the dry run", () => {
    expect(findingsFor(tx(UNVERIFIED_CONTRACT, "0xdeadbeef", "0x0", "curvefront.xyz"))).toEqual([
      "unverified-contract",
    ]);
  });

  it("known drainer as a spender, worst first", () => {
    expect(findingsFor(tx(USDG, approve(DRAINER, MAX)))).toEqual([
      "known-drainer",
      "unlimited-approval",
    ]);
  });

  it("phishing domain on the Hood Swap clone", () => {
    expect(findingsFor(tx(USDG, approve(ROUTER, pad("0x64")), "0x0", "hoodswap-app.com"))).toEqual([
      "phishing-domain",
    ]);
  });

  it.each(["hoodswap-app.com", "h00dswap.app", "www.lendwell-fi.net", "curvefr0nt.xyz"])(
    "flags the lookalike %s",
    (origin) => {
      expect(phishingFinding(origin, known)?.id).toBe("phishing-domain");
    },
  );

  it.each(["hoodswap.app", "WWW.lendwell.fi", "example.org", "swap.app"])("trusts %s", (origin) => {
    expect(phishingFinding(origin, known)).toBeUndefined();
  });

  it("finds nothing in a limited approval to a verified router", () => {
    expect(findingsFor(tx(USDG, approve(ROUTER, pad("0x64"))))).toEqual([]);
  });
});

describe("every intent kind", () => {
  const OPERATOR = "0x2222000000000000000000000000000000000002";
  const cases: [string, DappRequest, { verb: string; detail?: string }, string | undefined][] = [
    [
      "approve-all",
      tx(ROUTER, `0xa22cb465${pad(OPERATOR)}${pad("0x1")}`),
      { verb: "Allow moving every item", detail: "by 0x2222…0002" },
      "approve",
    ],
    [
      "a bare call",
      tx(ROUTER, "0xdeadbeef"),
      { verb: "Call contract", detail: "0x1111…0001" },
      "contract",
    ],
    [
      "a call with ETH",
      tx(ROUTER, "0xdeadbeef", "0x1"),
      { verb: "Send", detail: "to contract 0x1111…0001" },
      "contract",
    ],
    [
      "a limited permit",
      {
        method: "eth_signTypedData_v4",
        origin: "x",
        typedData: {
          domain: { verifyingContract: USDG },
          primaryType: "Permit",
          message: { spender: ROUTER, value: "100" },
        },
      },
      { verb: "Allow limited USDG spending", detail: "by 0x1111…0001 by signature" },
      undefined,
    ],
    [
      "typed data for a contract",
      {
        method: "eth_signTypedData_v4",
        origin: "x",
        typedData: {
          domain: { verifyingContract: UNVERIFIED_CONTRACT },
          primaryType: "Order",
          message: {},
        },
      },
      { verb: "Sign Order", detail: "for 0x7a11…0f0e" },
      undefined,
    ],
    [
      "a text message",
      { method: "personal_sign", origin: "x", message: "gm" },
      { verb: "Sign a message" },
      undefined,
    ],
    [
      "a blind message",
      { method: "personal_sign", origin: "x", message: `0x${"00".repeat(32)}` },
      { verb: "Sign unreadable data" },
      undefined,
    ],
  ];

  it.each(cases)("summarizes %s and maps it to a request", (_name, request, summary, kind) => {
    const intent = decodeIntent(request);
    expect(intentSummary(intent)).toMatchObject(summary);
    expect(intentRequest(intent, fee)?.kind).toBe(kind);
  });

  it("names an approval of an unknown token by its address", () => {
    const other = "0x9999000000000000000000000000000000000009";
    expect(intentSummary(decodeIntent(tx(other, approve(ROUTER, pad("0x1"))))).verb).toBe(
      "Allow limited token 0x9999…0009 spending",
    );
  });

  it("ignores a Permit whose value is not a number", () => {
    const typedData = { domain: {}, primaryType: "Permit", message: { value: "lots" } };
    expect(decodeIntent({ method: "eth_signTypedData_v4", origin: "x", typedData }).kind).toBe(
      "typed",
    );
  });

  it("flags a Permit to a drainer and typed data for an unverified contract", () => {
    const permit = {
      domain: { verifyingContract: USDG },
      primaryType: "Permit",
      message: { spender: DRAINER, value: "1" },
    };
    expect(
      findingsFor({ method: "eth_signTypedData_v4", origin: "hoodswap.app", typedData: permit }),
    ).toEqual(["known-drainer"]);
    const order = {
      domain: { verifyingContract: UNVERIFIED_CONTRACT },
      primaryType: "Order",
      message: {},
    };
    expect(
      findingsFor({ method: "eth_signTypedData_v4", origin: "curvefront.xyz", typedData: order }),
    ).toEqual(["unverified-contract"]);
  });
});
