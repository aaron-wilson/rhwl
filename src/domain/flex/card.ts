import * as z from "zod/mini";
import { decodeAmount, encodeAmount, AmountJson } from "../money/codec";
import type { Amount } from "../money/amount";

/**
 * A gain/loss card as signed. Version 1. With balances hidden the dollar
 * figure is left out, and the signature covers exactly what is shown.
 */
export interface FlexCard {
  readonly account: string;
  readonly accountName: string;
  readonly assetId: string;
  readonly symbol: string;
  readonly pnlBps: bigint;
  readonly pnlCents: bigint | undefined;
  readonly entry: Amount;
  readonly mark: Amount;
  readonly at: Date;
}

const CardJson = z.object({
  v: z.literal(1),
  account: z.string().check(z.minLength(1), z.maxLength(64)),
  name: z.string().check(z.minLength(1), z.maxLength(64)),
  asset: z.string().check(z.minLength(1), z.maxLength(32)),
  symbol: z.string().check(z.minLength(1), z.maxLength(16)),
  pnlBps: z.string().check(z.regex(/^-?\d{1,9}$/)),
  pnlCents: z.optional(z.string().check(z.regex(/^-?\d{1,18}$/))),
  entry: AmountJson,
  mark: AmountJson,
  at: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)),
});

/** The exact text that is signed: stable JSON with keys in a fixed order. */
export function encodeCard(card: FlexCard): string {
  return JSON.stringify({
    v: 1,
    account: card.account,
    name: card.accountName,
    asset: card.assetId,
    symbol: card.symbol,
    pnlBps: card.pnlBps.toString(),
    ...(card.pnlCents === undefined ? {} : { pnlCents: card.pnlCents.toString() }),
    entry: encodeAmount(card.entry),
    mark: encodeAmount(card.mark),
    at: card.at.toISOString(),
  });
}

/** Parses signed text back into a card; undefined for anything malformed. */
export function decodeCard(text: string): FlexCard | undefined {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  const parsed = CardJson.safeParse(json);
  if (!parsed.success) return undefined;
  const p = parsed.data;
  return {
    account: p.account,
    accountName: p.name,
    assetId: p.asset,
    symbol: p.symbol,
    pnlBps: BigInt(p.pnlBps),
    pnlCents: p.pnlCents === undefined ? undefined : BigInt(p.pnlCents),
    entry: decodeAmount(p.entry),
    mark: decodeAmount(p.mark),
    at: new Date(p.at),
  };
}

const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromBase64Url = (text: string): string | undefined => {
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(binary, (c) => c.charCodeAt(0)),
    );
  } catch {
    return undefined;
  }
};

/** The verify link's query: the signed text, base64url, and its signature. */
export function verifyQuery(signedText: string, signature: string): string {
  return new URLSearchParams({ card: toBase64Url(signedText), sig: signature }).toString();
}

/** Reads a verify link's query back into the signed text and signature. */
export function readVerifyQuery(
  params: URLSearchParams,
): { readonly text: string; readonly signature: string } | undefined {
  const card = params.get("card");
  const signature = params.get("sig");
  if (card === null || signature === null) return undefined;
  const text = fromBase64Url(card);
  return text === undefined ? undefined : { text, signature };
}
