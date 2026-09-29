import { assetById } from "../../data/assets";
import { tokenContracts } from "../../data/contracts";
import type { BalanceDelta, TxRequest, TxSummary } from "../../ports/chain";
import { shortAddress } from "../keys/address";
import { amount, type Amount } from "../money/amount";
import { decodeCall, UNLIMITED_FROM } from "./calldata";
import type { DappRequest } from "./request";

type Allowance = Amount | "unlimited";

/** What a request would do, in the wallet's own terms. */
export type Intent =
  | {
      readonly kind: "transfer";
      readonly to: string;
      readonly assetId: string;
      readonly value: Amount;
    }
  | {
      readonly kind: "approve";
      readonly spender: string;
      readonly token: string;
      readonly allowance: Allowance;
    }
  | { readonly kind: "approve-all"; readonly operator: string; readonly contract: string }
  | { readonly kind: "call"; readonly to: string; readonly value: Amount }
  | { readonly kind: "message"; readonly text: string; readonly blind: boolean }
  | {
      readonly kind: "permit";
      readonly spender: string;
      readonly token: string;
      readonly allowance: Allowance;
    }
  | { readonly kind: "typed"; readonly primaryType: string; readonly contract: string | undefined };

const ETH = "rh:ETH";
const eth = (hex: string) => amount(BigInt(hex === "0x" ? "0x0" : hex), 18);

function allowanceOf(token: string, raw: bigint): Allowance {
  const assetId = tokenContracts[token];
  if (raw >= UNLIMITED_FROM) return "unlimited";
  return amount(raw, assetId === undefined ? 18 : assetById(assetId).decimals);
}

/** Bytes that are printable text are shown as text; anything else is a blind signature. */
function readMessage(message: string): { text: string; blind: boolean } {
  if (!/^0x([0-9a-fA-F]{2})*$/.test(message)) return { text: message, blind: false };
  const bytes = (message.slice(2).match(/../g) ?? []).map((b) => parseInt(b, 16));
  const printable = bytes.length > 0 && bytes.every((b) => b === 10 || (b >= 32 && b < 127));
  return printable
    ? { text: String.fromCharCode(...bytes), blind: false }
    : { text: message, blind: true };
}

const str = (value: unknown): string => (typeof value === "string" ? value.toLowerCase() : "");

/** Decodes a site's request into an intent. Unknown calls stay calls; nothing is guessed. */
export function decodeIntent(request: DappRequest): Intent {
  if (request.method === "personal_sign")
    return { kind: "message", ...readMessage(request.message) };
  if (request.method === "eth_signTypedData_v4") {
    const { domain, primaryType, message } = request.typedData;
    const token = str(domain.verifyingContract);
    const value = message["value"];
    if (
      primaryType === "Permit" &&
      typeof value === "string" &&
      /^(0x[0-9a-f]+|\d+)$/i.test(value)
    ) {
      const raw = BigInt(value);
      return {
        kind: "permit",
        spender: str(message["spender"]),
        token,
        allowance: allowanceOf(token, raw),
      };
    }
    return { kind: "typed", primaryType, contract: domain.verifyingContract?.toLowerCase() };
  }
  const to = request.tx.to.toLowerCase();
  const call = decodeCall(request.tx.data);
  if (call.name === "approve")
    return {
      kind: "approve",
      spender: call.spender,
      token: to,
      allowance: allowanceOf(to, call.value),
    };
  if (call.name === "setApprovalForAll" && call.approved)
    return { kind: "approve-all", operator: call.operator, contract: to };
  const assetId = tokenContracts[to];
  if (call.name === "transfer" && assetId !== undefined)
    return {
      kind: "transfer",
      to: call.to,
      assetId,
      value: amount(call.value, assetById(assetId).decimals),
    };
  if (request.tx.data === "0x")
    return { kind: "transfer", to, assetId: ETH, value: eth(request.tx.value) };
  return { kind: "call", to, value: eth(request.tx.value) };
}

const tokenName = (token: string) => {
  const assetId = tokenContracts[token];
  return assetId === undefined ? `token ${shortAddress(token)}` : assetById(assetId).symbol;
};
const out = (assetId: string, value: Amount): BalanceDelta => ({
  assetId,
  quantity: amount(-value.base, value.decimals),
});

/** The intent as a transaction title: amounts stay data so hidden balances stay hidden. */
export function intentSummary(intent: Intent): TxSummary {
  switch (intent.kind) {
    case "transfer":
      return {
        verb: "Send",
        primary: out(intent.assetId, intent.value),
        detail: `to ${shortAddress(intent.to)}`,
      };
    case "approve":
    case "permit": {
      const how = intent.kind === "permit" ? " by signature" : "";
      const limit = intent.allowance === "unlimited" ? "unlimited" : "limited";
      return {
        verb: `Allow ${limit} ${tokenName(intent.token)} spending`,
        detail: `by ${shortAddress(intent.spender)}${how}`,
      };
    }
    case "approve-all":
      return { verb: "Allow moving every item", detail: `by ${shortAddress(intent.operator)}` };
    case "call":
      return intent.value.base > 0n
        ? {
            verb: "Send",
            primary: out(ETH, intent.value),
            detail: `to contract ${shortAddress(intent.to)}`,
          }
        : { verb: "Call contract", detail: shortAddress(intent.to) };
    case "message":
      return { verb: intent.blind ? "Sign unreadable data" : "Sign a message" };
    case "typed":
      return intent.contract === undefined
        ? { verb: `Sign ${intent.primaryType}` }
        : { verb: `Sign ${intent.primaryType}`, detail: `for ${shortAddress(intent.contract)}` };
  }
}

/** A transaction intent as a request the simulation can dry-run; signatures have none. */
export function intentRequest(intent: Intent, fee: BalanceDelta): TxRequest | undefined {
  const summary = intentSummary(intent);
  switch (intent.kind) {
    case "transfer":
      return {
        kind: "send",
        summary,
        fee,
        to: intent.to,
        deltas: [out(intent.assetId, intent.value)],
      };
    case "approve":
      return {
        kind: "approve",
        summary,
        fee,
        to: intent.spender,
        deltas: [],
        allowance: intent.allowance,
      };
    case "approve-all":
      return {
        kind: "approve",
        summary,
        fee,
        to: intent.operator,
        deltas: [],
        allowance: "unlimited",
      };
    case "call":
      return {
        kind: "contract",
        summary,
        fee,
        to: intent.to,
        deltas: intent.value.base > 0n ? [out(ETH, intent.value)] : [],
      };
    default:
      return undefined;
  }
}
