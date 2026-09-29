import { Check, Repeat } from "lucide-react";
import { useState } from "react";
import { useProviders } from "../../app/providers-context";
import { permissionText, type Dapp } from "../../data/dapps";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import { Sheet } from "../../ui/Sheet";
import { showToast } from "../../ui/toast";
import { useAccounts, useActiveAccount } from "../accounts";
import { chainName } from "../../data/chains";
import { connectDapp } from "./connections-store";

interface ConnectSheetProps {
  readonly dapp: Dapp;
  readonly open: boolean;
  readonly onClose: () => void;
}

/** Which account a site sees, on which network, and what it may ask for. */
export function ConnectSheet({ dapp, open, onClose }: ConnectSheetProps) {
  const { clock } = useProviders();
  const active = useActiveAccount();
  const accounts = useAccounts().filter((a) => !a.hidden && a.kind !== "watch");
  const [account, setAccount] = useState(() =>
    accounts.some((a) => a.id === active) ? active : (accounts[0]?.id ?? active),
  );
  const switches = dapp.chain !== "robinhood";

  function connect() {
    connectDapp({
      dappId: dapp.id,
      account,
      chain: dapp.chain,
      permissions: dapp.permissions,
      connectedAt: clock.now(),
    });
    if (switches) showToast(`Switched to ${chainName(dapp.chain)} for ${dapp.origin}`);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Connect to ${dapp.name}`}
      description={dapp.origin}
    >
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-footnote font-semibold text-ink-3">Account</legend>
          {accounts.map((a) => (
            <label
              key={a.id}
              className="flex items-center gap-3 rounded-md bg-surface-2 px-3 py-2 text-body"
            >
              <input
                type="radio"
                name="connect-account"
                value={a.id}
                checked={account === a.id}
                onChange={() => {
                  setAccount(a.id);
                }}
              />
              {a.name}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1">
          <h3 className="text-footnote font-semibold text-ink-3">Network</h3>
          <p className="flex items-center gap-2 text-body" data-testid="connect-network">
            {switches && <Repeat {...icon()} className="text-accent" />}
            {switches
              ? `Switches to ${chainName(dapp.chain)} for this site`
              : chainName(dapp.chain)}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-footnote font-semibold text-ink-3">This site will be able to</h3>
          <ul aria-label="Permissions" className="flex flex-col gap-1">
            {dapp.permissions.map((p) => (
              <li key={p} className="flex items-center gap-2 text-body">
                <Check {...icon()} className="text-gain" />
                {permissionText[p]}
              </li>
            ))}
          </ul>
          <p className="text-footnote text-ink-2">
            It can never move funds without your signature.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button block onClick={connect}>
            Connect
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
