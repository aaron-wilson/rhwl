import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";
import { chainName } from "../../data/chains";
import { dapps } from "../../data/dapps";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useAccounts } from "../accounts";
import { disconnectAll, disconnectDapp, useConnections } from "./connections-store";

/** Every site the user let in, with the account and network each one sees. */
export function ConnectedSitesPage() {
  const connections = useConnections();
  const accounts = useAccounts();
  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/settings"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Settings
      </Link>
      <PageHeader title="Connected sites" subtitle="Sites that can see an account" />
      {connections.length === 0 ? (
        <Card className="flex flex-col gap-2 text-body text-ink-2">
          <p>No site is connected.</p>
          <Link to="/browse" className="self-start font-semibold text-accent">
            Open Apps
          </Link>
        </Card>
      ) : (
        <>
          <ul aria-label="Connected sites" className="flex flex-col gap-2">
            {connections.map((c) => {
              const dapp = dapps.find((d) => d.id === c.dappId);
              const name = dapp?.name ?? c.dappId;
              return (
                <li key={c.dappId}>
                  <Card className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="text-headline font-semibold">{name}</span>
                      <span className="truncate text-footnote text-ink-2">
                        {dapp?.origin} · {accounts.find((a) => a.id === c.account)?.name} ·{" "}
                        {chainName(c.chain)}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label={`Disconnect ${dapp?.origin ?? name}`}
                      onClick={() => {
                        disconnectDapp(c.dappId);
                      }}
                    >
                      Disconnect
                    </Button>
                  </Card>
                </li>
              );
            })}
          </ul>
          <Button variant="destructive" onClick={disconnectAll}>
            Disconnect all
          </Button>
        </>
      )}
    </div>
  );
}
