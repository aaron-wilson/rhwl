import { useState } from "react";
import { Button } from "../../ui/Button";
import { Sheet } from "../../ui/Sheet";
import { closeAccountSheet } from "./account-sheet-store";
import { AccountRow } from "./AccountRow";
import { PairingPanel } from "./PairingPanel";
import { setAccountHidden, useAccounts } from "./accounts-store";
import { setActiveAccount, useActiveAccount } from "./active-account";

/** Switch, rename, reorder and hide accounts. Loaded when first opened. */
export function AccountSheet() {
  const accounts = useAccounts();
  const active = useActiveAccount();
  const [editing, setEditing] = useState(false);
  const [pairing, setPairing] = useState(false);
  const visible = accounts.filter((a) => !a.hidden);
  const hidden = accounts.filter((a) => a.hidden);
  return (
    <Sheet
      open
      onClose={closeAccountSheet}
      title="Accounts"
      description="Each account has its own addresses and balances"
    >
      <div className="flex flex-col gap-4">
        <ul aria-label="Accounts" className="flex flex-col gap-1">
          {visible.map((account) => (
            <li key={account.id}>
              <AccountRow
                account={account}
                active={account.id === active}
                editing={editing}
                onChoose={() => {
                  setActiveAccount(account.id);
                  closeAccountSheet();
                }}
              />
            </li>
          ))}
        </ul>
        {hidden.length > 0 && (
          <section aria-label="Hidden accounts" className="flex flex-col gap-2">
            <h3 className="text-footnote font-semibold text-ink-3">Hidden</h3>
            {hidden.map((account) => (
              <div key={account.id} className="flex items-center justify-between px-3">
                <span className="text-body text-ink-2">{account.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAccountHidden(account.id, false);
                  }}
                >
                  Show {account.name}
                </Button>
              </div>
            ))}
          </section>
        )}
        {pairing ? (
          <PairingPanel
            onDone={() => {
              setPairing(false);
              closeAccountSheet();
            }}
            onCancel={() => {
              setPairing(false);
            }}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditing((was) => !was);
              }}
            >
              {editing ? "Done" : "Edit accounts"}
            </Button>
            {!accounts.some((a) => a.kind === "hardware") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setPairing(true);
                }}
              >
                Add hardware wallet
              </Button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
