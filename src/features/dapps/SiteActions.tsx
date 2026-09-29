import { useState } from "react";
import { useProviders } from "../../app/providers-context";
import { dappActions } from "../../data/dapp-actions";
import type { Dapp } from "../../data/dapps";
import { Button } from "../../ui/Button";
import type { Connection } from "./connections-store";
import { askSite } from "./site-request";

/** The fictional site's own buttons, each sending the wallet a request to review. */
export function SiteActions({
  dapp,
  connection,
}: {
  readonly dapp: Dapp;
  readonly connection: Connection;
}) {
  const providers = useProviders();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {(dappActions[dapp.id] ?? []).map((action) => (
        <Button
          key={action.label}
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void askSite(providers, dapp, connection, action.request).finally(() => {
              setBusy(false);
            });
          }}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
