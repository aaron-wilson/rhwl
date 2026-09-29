import { tokenContracts } from "../../data/contracts";
import { knownOrigins, type Dapp } from "../../data/dapps";
import { decodeIntent, intentRequest, type Intent } from "../../domain/requests/intent";
import { parseDappRequest, type DappRequest } from "../../domain/requests/request";
import { requestFindings } from "../../domain/requests/risk";
import type { Providers } from "../../ports/providers";
import { showToast } from "../../ui/toast";
import { recordApproval } from "../approvals";
import { signerStore } from "../transactions";
import { NETWORK_FEE, runTransaction, signMessageAs } from "../transactions/actions";
import type { Connection } from "./connections-store";

function messageText(request: DappRequest, intent: Intent): string {
  if (request.method === "eth_signTypedData_v4") return JSON.stringify(request.typedData, null, 2);
  if (intent.kind !== "message") return "";
  return intent.blind ? `Unreadable data:\n${intent.text}` : intent.text;
}

/**
 * Handles one request from a connected site: refuse it if malformed or beyond
 * the connection's permissions; otherwise decode it, add the site and signature
 * findings to the dry run's, and put it in front of the user to sign.
 */
export async function askSite(
  providers: Providers,
  dapp: Dapp,
  connection: Connection,
  raw: Readonly<Record<string, unknown>>,
): Promise<void> {
  const request = parseDappRequest({ ...raw, origin: dapp.origin });
  if (request === undefined) {
    showToast(`Refused a malformed request from ${dapp.origin}`, "error");
    return;
  }
  const intent = decodeIntent(request);
  const needs = request.method === "eth_sendTransaction" ? "transact" : "sign";
  if (!connection.permissions.includes(needs)) {
    showToast(`${dapp.origin} is not allowed to ask for that`, "error");
    return;
  }
  if (request.method === "eth_sendTransaction") {
    const tx = intentRequest(intent, NETWORK_FEE);
    if (tx === undefined) return;
    const sign = signerStore.get().sign;
    const done = await runTransaction(
      providers,
      connection.account,
      { ...tx, requestedBy: dapp.origin },
      (req, sim, account) =>
        sign(
          req,
          { ...sim, findings: requestFindings(dapp.origin, knownOrigins, intent, sim.findings) },
          account,
        ),
    );
    const assetId = intent.kind === "approve" ? tokenContracts[intent.token] : undefined;
    if (done.machine.state === "confirmed" && intent.kind === "approve" && assetId !== undefined) {
      recordApproval({
        id: `${dapp.id}:${intent.token}:${intent.spender}`,
        account: connection.account,
        chain: connection.chain,
        assetId,
        spender: intent.spender,
        spenderName: dapp.name,
        allowance: intent.allowance === "unlimited" ? "unlimited" : intent.allowance.base,
        grantedAt: providers.clock.now(),
      });
    }
    return;
  }
  const payload =
    request.method === "personal_sign" ? request.message : JSON.stringify(request.typedData);
  const signed = await signMessageAs(connection.account, {
    payload,
    display: messageText(request, intent),
    origin: dapp.origin,
    findings: requestFindings(dapp.origin, knownOrigins, intent),
  });
  if (signed !== undefined) showToast(`Signed for ${dapp.origin}`, "success");
}
