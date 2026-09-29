import { ChevronLeft, Globe } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { dappByAddress, dapps } from "../../data/dapps";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { chainName } from "../../data/chains";
import { useConnections } from "./connections-store";

const kindText = { dex: "Exchange", lending: "Lending", launchpad: "Launchpad" } as const;

/** The in-wallet browser's start page: an address bar and the listed sites. */
export function BrowserPage() {
  const navigate = useNavigate();
  const connections = useConnections();
  const [address, setAddress] = useState("");
  const [missing, setMissing] = useState(false);

  function open() {
    const dapp = dappByAddress(address);
    setMissing(dapp === undefined);
    if (dapp !== undefined) void navigate(`/browse/${dapp.id}`);
  }

  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/settings"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Settings
      </Link>
      <PageHeader title="Apps" subtitle="Sites that run on Robinhood Chain and its neighbors" />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          open();
        }}
        role="search"
        className="flex flex-col gap-1"
      >
        <label className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2">
          <Globe {...icon()} className="text-ink-3" />
          <span className="sr-only">Site address</span>
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setMissing(false);
            }}
            placeholder="Search or enter a site address"
            className="min-w-0 flex-1 bg-transparent text-body outline-none"
            inputMode="url"
            autoCapitalize="off"
          />
        </label>
        {missing && (
          <p role="alert" className="px-4 text-footnote text-loss">
            No site at that address in this demo.
          </p>
        )}
      </form>
      <ul aria-label="Sites" className="flex flex-col gap-2">
        {dapps
          .filter((d) => d.listed)
          .map((d) => (
            <li key={d.id}>
              <Link to={`/browse/${d.id}`} className="block rounded-lg">
                <Card className="flex flex-col gap-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-headline font-semibold">{d.name}</span>
                    {connections.some((c) => c.dappId === d.id) && (
                      <span className="text-footnote font-semibold text-gain">Connected</span>
                    )}
                  </span>
                  <span className="text-footnote text-ink-2">
                    {d.origin} · {kindText[d.kind]} · {chainName(d.chain)}
                  </span>
                  <span className="text-body text-ink-2">{d.tagline}</span>
                </Card>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}
