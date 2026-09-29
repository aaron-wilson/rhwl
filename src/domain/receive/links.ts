import type { Chain } from "../../data/types";
import { parseAmount, toPlainDecimal } from "../money/amount";

/**
 * What the QR code carries for a bare address: an EIP-681 URI pinned to the
 * chain for EVM networks (so a scanning wallet picks the right network), or a
 * Solana Pay URI.
 */
export function addressUri(chain: Chain, address: string): string {
  return chain.evmId === undefined ? `solana:${address}` : `ethereum:${address}@${chain.evmId}`;
}

export interface PaymentRequest {
  readonly to: string;
  readonly chain: Chain["id"];
  readonly assetId: string;
  /** Decimal text in whole tokens, e.g. "25" or "0.5". */
  readonly amount: string;
}

/**
 * A link that opens this wallet's Send screen already filled in. Works for any
 * asset, unlike URI schemes that need a token contract per chain.
 */
export function requestLink(origin: string, request: PaymentRequest): string {
  const params = new URLSearchParams({
    to: request.to,
    chain: request.chain,
    asset: request.assetId,
    amount: request.amount,
  });
  return `${origin}/send?${params.toString()}`;
}

/**
 * Normalizes a typed request amount: positive, within the token's decimals.
 * Returns undefined for anything else, including zero.
 */
export function requestAmount(text: string, decimals: number): string | undefined {
  const value = parseAmount(text.trim(), decimals);
  if (value === undefined || value.base <= 0n) return undefined;
  return toPlainDecimal(value);
}
