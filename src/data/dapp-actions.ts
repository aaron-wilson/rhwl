import { UNVERIFIED_CONTRACT } from "./contracts";

/** A button on a fictional site and the raw request it sends the wallet, before validation. */
export interface DappAction {
  readonly label: string;
  readonly request: Readonly<Record<string, unknown>>;
}

const USDG = "0x5d6e000000000000000000000000000000000a01";
const ROUTER = "0x1111000000000000000000000000000000000001";
const POOL = "0x1e5d000000000000000000000000000000000001";
const DRAINER = "0xdead0000000000000000000000000000000beef1";
const word = (hex: string) => hex.replace(/^0x/, "").padStart(64, "0");
const approve = (spender: string, value: string) => ({
  method: "eth_sendTransaction",
  tx: { to: USDG, data: `0x095ea7b3${word(spender)}${word(value)}` },
});
const MAX = `0x${"f".repeat(64)}`;
const signIn = (site: string) => ({
  method: "personal_sign",
  message: `Sign in to ${site}.\nThis request will not trigger a transaction.`,
});

/**
 * Each site's buttons, seeded so every risk finding has a request that raises
 * it: unlimited approval (Hood Swap), unverified contract (Curvefront), known
 * drainer and phishing domain (the clone).
 */
export const dappActions: Readonly<Record<string, readonly DappAction[]>> = {
  "hood-swap": [
    { label: "Sign in", request: signIn("Hood Swap") },
    { label: "Enable USDG trading", request: approve(ROUTER, MAX) },
  ],
  lendwell: [{ label: "Supply 100 USDG", request: approve(POOL, "0x5f5e100") }],
  curvefront: [
    {
      label: "Back CURVE with 0.01 ETH",
      request: {
        method: "eth_sendTransaction",
        tx: { to: UNVERIFIED_CONTRACT, data: "0xd0e30db0", value: "0x2386f26fc10000" },
      },
    },
    {
      label: "Sign launch order",
      request: {
        method: "eth_signTypedData_v4",
        typedData: {
          domain: { name: "Curvefront", verifyingContract: UNVERIFIED_CONTRACT },
          primaryType: "Order",
          message: { token: "CURVE", side: "buy" },
        },
      },
    },
  ],
  "hood-swap-clone": [
    { label: "Enable USDG trading", request: approve(DRAINER, MAX) },
    {
      label: "Claim airdrop",
      request: {
        method: "eth_signTypedData_v4",
        typedData: {
          domain: { name: "USDG", verifyingContract: USDG },
          primaryType: "Permit",
          message: { owner: "you", spender: DRAINER, value: MAX },
        },
      },
    },
  ],
};
