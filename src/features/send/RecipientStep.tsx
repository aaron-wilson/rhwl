import { ShieldAlert } from "lucide-react";
import { useId } from "react";
import { shortAddress } from "../../domain/keys/address";
import { Avatar } from "../../ui/Avatar";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { ListRow } from "../../ui/ListRow";
import { inputClass } from "./send-form";
import type { RecipientField } from "./useRecipient";

/** Address or name, with resolution, the poisoning check and suggestions. */
export function RecipientStep({ field }: { readonly field: RecipientField }) {
  const ids = { to: useId(), help: useId(), status: useId() };
  return (
    <section aria-labelledby="send-to" className="flex flex-col gap-2">
      <label id="send-to" htmlFor={ids.to} className="px-1 text-footnote font-semibold text-ink-3">
        To
      </label>
      <input
        id={ids.to}
        value={field.to}
        onChange={(event) => {
          field.setTo(event.target.value);
        }}
        placeholder="Address or name.rh"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
        aria-describedby={`${ids.status} ${ids.help}`}
        aria-invalid={field.recipient.status === "invalid" || field.self}
        className={`${inputClass} font-mono`}
      />
      <p id={ids.status} aria-live="polite" className="px-1 text-footnote">
        {field.recipient.status === "invalid" && (
          <span className="text-loss">{field.recipient.reason}</span>
        )}
        {field.self && (
          <span className="text-loss">That&apos;s this account&apos;s own address</span>
        )}
        {field.recipient.status === "ok" && !field.self && (
          <span className="text-ink-2" data-testid="recipient">
            {field.recipient.name === undefined ? "Address" : field.recipient.name} ·{" "}
            <span className="font-mono">{shortAddress(field.recipient.address)}</span>
          </span>
        )}
      </p>
      <p id={ids.help} className="px-1 text-caption text-ink-3">
        Mixed-case addresses are checked against their EIP-55 checksum. Still compare the first and
        last characters with the owner.
      </p>
      {field.lookalike !== undefined && (
        <div role="alert" className="flex flex-col gap-3 rounded-md bg-loss-soft p-4 text-loss">
          <p className="flex gap-2 text-footnote font-semibold">
            <ShieldAlert {...icon()} className="shrink-0" />
            This looks like {field.lookalike.label} ({shortAddress(field.lookalike.address)}) but it
            isn&apos;t. Scammers send dust from lookalike addresses so you copy one by mistake.
          </p>
          <label className="flex items-center gap-2 text-footnote">
            <input
              type="checkbox"
              checked={field.checked}
              onChange={(event) => {
                field.setChecked(event.target.checked);
              }}
            />
            I&apos;ve checked every character of this address
          </label>
        </div>
      )}
      {field.to.trim() === "" && field.known.length > 0 && (
        <Card padding="list">
          <ul aria-label="Suggestions">
            {field.known.map((k) => (
              <li key={k.address}>
                <ListRow
                  leading={<Avatar seed={k.address} label={k.label} size="sm" />}
                  title={k.label}
                  subtitle={<span className="font-mono">{shortAddress(k.address)}</span>}
                  onClick={() => {
                    field.setTo(k.address);
                  }}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
