import { Check, ChevronDown, ChevronUp, EyeOff } from "lucide-react";
import { useState } from "react";
import { shortAddress } from "../../domain/keys/address";
import { Avatar } from "../../ui/Avatar";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import { MAX_NAME, moveAccount, renameAccount, type AccountEntry } from "./accounts-store";
import { hideAccount } from "./active-account";

interface AccountRowProps {
  readonly account: AccountEntry;
  readonly active: boolean;
  readonly editing: boolean;
  readonly onChoose: () => void;
}

export function AccountRow({ account, active, editing, onChoose }: AccountRowProps) {
  const [name, setName] = useState(account.name);
  const summary = (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="flex items-center gap-2 truncate font-semibold">
        {account.name}
        {account.kind === "hardware" && <Badge tone="neutral">Hardware</Badge>}
      </span>
      <span className="truncate text-footnote text-ink-3">
        {shortAddress(account.address)}
        {account.solanaAddress !== undefined && ` · SOL ${shortAddress(account.solanaAddress)}`}
      </span>
    </span>
  );
  if (!editing) {
    return (
      <button
        type="button"
        onClick={onChoose}
        aria-current={active || undefined}
        className="flex min-h-14 w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-2"
      >
        <Avatar seed={account.address} label={account.name} />
        {summary}
        {active && <Check {...icon()} className="text-accent" />}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface-2 p-3">
      <div className="flex items-center gap-2">
        <Avatar seed={account.address} label={account.name} size="sm" />
        <label className="sr-only" htmlFor={`name-${account.id}`}>
          Name for {account.name}
        </label>
        <input
          id={`name-${account.id}`}
          value={name}
          maxLength={MAX_NAME}
          onChange={(event) => {
            setName(event.target.value);
          }}
          onBlur={() => {
            if (name.trim() === "") setName(account.name);
            else renameAccount(account.id, name);
          }}
          className="min-w-0 flex-1 rounded-sm bg-surface px-2 py-1 font-semibold outline-none focus-visible:outline-2 focus-visible:outline-focus"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          aria-label={`Move ${account.name} up`}
          onClick={() => {
            moveAccount(account.id, -1);
          }}
        >
          <ChevronUp {...icon("sm")} />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          aria-label={`Move ${account.name} down`}
          onClick={() => {
            moveAccount(account.id, 1);
          }}
        >
          <ChevronDown {...icon("sm")} />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<EyeOff {...icon("sm")} />}
          onClick={() => {
            hideAccount(account.id);
          }}
        >
          Hide
        </Button>
      </div>
    </div>
  );
}
