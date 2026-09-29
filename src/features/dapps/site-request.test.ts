import { describe, expect, it } from "vitest";
import { dappActions } from "../../data/dapp-actions";
import { dapps, type Dapp } from "../../data/dapps";
import type { RiskFinding } from "../../ports/simulation";
import { testProviders } from "../../test/providers";
import { signerStore } from "../transactions";
import type { Connection } from "./connections-store";
import { askSite } from "./site-request";

const dapp = (id: string): Dapp => {
  const found = dapps.find((d) => d.id === id);
  if (found === undefined) throw new Error(id);
  return found;
};
const connection = (d: Dapp): Connection => ({
  dappId: d.id,
  account: "main",
  chain: d.chain,
  permissions: d.permissions,
  connectedAt: new Date("2026-09-29T16:00:00Z"),
});
const action = (id: string, label: string) => {
  const found = dappActions[id]?.find((a) => a.label === label);
  if (found === undefined) throw new Error(label);
  return found.request;
};

function capture() {
  const seen: {
    findings: readonly RiskFinding[];
    origin?: string | undefined;
    display?: string | undefined;
  }[] = [];
  signerStore.set({
    sign: (request, simulation) => {
      seen.push({ findings: simulation.findings, origin: request.requestedBy });
      return Promise.resolve(false);
    },
    approveMessage: (message) => {
      seen.push({
        findings: message.findings ?? [],
        origin: message.origin,
        display: message.display,
      });
      return Promise.resolve(false);
    },
  });
  return seen;
}
const ids = (findings: readonly RiskFinding[]) => findings.map((f) => f.id);

describe("askSite", () => {
  it("shows an unlimited approval with the dry run's finding and the site", async () => {
    const seen = capture();
    const site = dapp("hood-swap");
    await askSite(
      testProviders(),
      site,
      connection(site),
      action("hood-swap", "Enable USDG trading"),
    );
    expect(seen.map((s) => s.origin)).toEqual(["hoodswap.app"]);
    expect(ids(seen[0]?.findings ?? [])).toEqual(["unlimited-approval"]);
  });

  it("flags the unverified contract a launchpad call goes to", async () => {
    const seen = capture();
    const site = dapp("curvefront");
    await askSite(
      testProviders(),
      site,
      connection(site),
      action("curvefront", "Back CURVE with 0.01 ETH"),
    );
    expect(ids(seen[0]?.findings ?? [])).toEqual(["unverified-contract"]);
  });

  it("adds phishing to the drainer on the clone, worst first", async () => {
    const seen = capture();
    const site = dapp("hood-swap-clone");
    await askSite(
      testProviders(),
      site,
      connection(site),
      action("hood-swap-clone", "Enable USDG trading"),
    );
    expect(ids(seen[0]?.findings ?? [])).toEqual([
      "phishing-domain",
      "known-drainer",
      "unlimited-approval",
    ]);
  });

  it("puts a Permit through the message sheet with its findings", async () => {
    const seen = capture();
    const site = dapp("hood-swap-clone");
    await askSite(
      testProviders(),
      site,
      connection(site),
      action("hood-swap-clone", "Claim airdrop"),
    );
    expect(seen[0]?.origin).toBe("hoodswap-app.com");
    expect(seen[0]?.display).toContain('"primaryType": "Permit"');
    expect(ids(seen[0]?.findings ?? [])).toEqual([
      "phishing-domain",
      "known-drainer",
      "unlimited-approval",
    ]);
  });

  it("shows a sign-in message as text with no findings", async () => {
    const seen = capture();
    const site = dapp("hood-swap");
    await askSite(testProviders(), site, connection(site), action("hood-swap", "Sign in"));
    expect(seen[0]?.display).toMatch(/^Sign in to Hood Swap\./);
    expect(seen[0]?.findings).toEqual([]);
  });

  it("refuses malformed requests and ones beyond the connection", async () => {
    const seen = capture();
    const site = dapp("lendwell");
    await askSite(testProviders(), site, connection(site), {
      method: "eth_sendTransaction",
      tx: { to: "0x1" },
    });
    await askSite(testProviders(), site, connection(site), action("hood-swap", "Sign in"));
    expect(seen).toEqual([]);
  });
});
