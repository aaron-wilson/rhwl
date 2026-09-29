import { shortAddress } from "../../domain/keys/address";
import { Avatar } from "../../ui/Avatar";
import { cx } from "../../ui/cx";
import { openAccountSheet } from "./account-sheet-store";
import { useActiveAccountEntry } from "./active-account";

/** Opens the account switcher. `compact` shows the avatar only (phone header). */
export function AccountButton({ compact = false }: { readonly compact?: boolean }) {
  const account = useActiveAccountEntry();
  if (account === undefined) return null;
  return (
    <button
      type="button"
      onClick={openAccountSheet}
      aria-label={`Account: ${account.name}. Switch account`}
      className={cx(
        "flex items-center gap-3 rounded-lg text-left transition-colors duration-fast",
        !compact && "w-full bg-surface-2 p-3 hover:bg-line",
      )}
    >
      <Avatar seed={account.address} label={account.name} size={compact ? "sm" : "md"} />
      {!compact && (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{account.name}</span>
          <span className="truncate text-footnote text-ink-3">{shortAddress(account.address)}</span>
        </span>
      )}
    </button>
  );
}
