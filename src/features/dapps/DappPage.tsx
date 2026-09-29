import { ChevronLeft, Lock } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { dapps, knownOrigins } from "../../data/dapps";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import { shortAddress } from "../../domain/keys/address";
import { useAccounts } from "../accounts";
import { chainName } from "../../data/chains";
import { ConnectSheet } from "./ConnectSheet";
import { phishingFinding } from "../../domain/requests/risk";
import { PhishingBlock } from "./PhishingBlock";
import { SiteActions } from "./SiteActions";
import { SiteBalance } from "./SiteBalance";
import { proceededStore, useConnection, useProceeded } from "./connections-store";

/** A fictional site inside the browser frame, with the wallet's address bar above it. */
export function DappPage() {
  const { id } = useParams();
  const dapp = dapps.find((d) => d.id === id);
  const connection = useConnection(dapp?.id ?? "");
  const account = useAccounts().find((a) => a.id === connection?.account);
  const [connecting, setConnecting] = useState(false);
  const proceeded = useProceeded();
  if (dapp === undefined) return <Navigate to="/browse" replace />;
  const phishing = phishingFinding(dapp.origin, knownOrigins);
  if (phishing !== undefined && !proceeded.includes(dapp.origin)) {
    return (
      <PhishingBlock
        origin={dapp.origin}
        finding={phishing}
        onProceed={() => {
          proceededStore.set((list) => [...list, dapp.origin]);
        }}
      />
    );
  }
  return (
    <div className="mx-auto flex max-w-phone flex-col gap-3 px-4 pt-4 pb-8">
      <nav aria-label="Browser" className="flex items-center gap-2">
        <Link to="/browse" aria-label="Back to Apps" className="rounded-full p-1 text-accent">
          <ChevronLeft {...icon()} />
        </Link>
        <p
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-footnote"
          data-testid="site-address"
        >
          <Lock {...icon("sm")} className="shrink-0 text-ink-3" />
          <span className="truncate">{dapp.origin}</span>
        </p>
      </nav>
      <section
        aria-label={`${dapp.name} site`}
        className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
      >
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-title2 font-bold">{dapp.name}</h1>
          {connection === undefined ? (
            <Button
              size="sm"
              onClick={() => {
                setConnecting(true);
              }}
            >
              Connect wallet
            </Button>
          ) : (
            <span className="text-footnote font-semibold text-gain">Connected</span>
          )}
        </header>
        <p className="text-body text-ink-2">{dapp.tagline}</p>
        {connection !== undefined && account !== undefined && (
          <dl
            className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body"
            data-testid="site-session"
          >
            <dt className="text-ink-2">Account</dt>
            <dd>
              {account.name} · {shortAddress(account.address)}
            </dd>
            <dt className="text-ink-2">Network</dt>
            <dd>{chainName(connection.chain)}</dd>
          </dl>
        )}
        {connection !== undefined && <SiteBalance account={connection.account} />}
        {connection !== undefined && <SiteActions dapp={dapp} connection={connection} />}
      </section>
      <ConnectSheet
        dapp={dapp}
        open={connecting}
        onClose={() => {
          setConnecting(false);
        }}
      />
    </div>
  );
}
