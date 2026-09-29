import { useState } from "react";
import { chains } from "../../data/chains";
import { parseCustomNetwork, type FormField, type FormInput } from "../../domain/networks/custom";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { LazySheet } from "../../ui/LazySheet";
import { customNetworksStore, useCustomNetworks } from "./networks-store";

const fields: readonly { key: FormField; label: string; placeholder: string }[] = [
  { key: "name", label: "Network name", placeholder: "My testnet" },
  { key: "rpcUrl", label: "RPC URL", placeholder: "https://rpc.example.org" },
  { key: "chainId", label: "Chain ID", placeholder: "12345" },
  { key: "symbol", label: "Currency symbol", placeholder: "ETH" },
];
const empty: FormInput = { name: "", rpcUrl: "", chainId: "", symbol: "" };

/** The networks the wallet knows, and a form to add one by hand. */
export function NetworksSettings() {
  const custom = useCustomNetworks();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormInput>(empty);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const taken = [
    ...chains.flatMap((c) => (c.evmId === undefined ? [] : [c.evmId])),
    ...custom.map((c) => c.chainId),
  ];

  function add() {
    const result = parseCustomNetwork(form, taken);
    if ("errors" in result) {
      setErrors(result.errors);
      return;
    }
    customNetworksStore.set((list) => [...list, result.network]);
    setForm(empty);
    setErrors({});
    setOpen(false);
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-footnote font-semibold text-ink-3">Networks</h2>
      <Card className="flex flex-col gap-3">
        <ul aria-label="Networks" className="flex flex-col gap-2 text-body">
          {chains.map((c) => (
            <li key={c.id} className="flex justify-between gap-2">
              {c.name}
              <span className="text-footnote text-ink-2">
                {c.evmId === undefined ? "Solana" : `Chain ${c.evmId}`}
              </span>
            </li>
          ))}
          {custom.map((c) => (
            <li key={c.chainId} className="flex items-center justify-between gap-2">
              <span className="flex flex-col">
                {c.name}
                <span className="text-footnote text-ink-2">
                  Custom · chain {c.chainId} · never contacted
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  customNetworksStore.set((list) => list.filter((n) => n.chainId !== c.chainId));
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(true);
          }}
        >
          Add a network
        </Button>
      </Card>
      <LazySheet
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Add a network"
        description="Saved for this session. The demo lists it but never connects to it."
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          {fields.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-footnote text-ink-2">
              {f.label}
              <input
                value={form[f.key]}
                placeholder={f.placeholder}
                aria-invalid={errors[f.key] !== undefined}
                onChange={(e) => {
                  setForm({ ...form, [f.key]: e.target.value });
                }}
                className="h-10 rounded-md bg-surface-2 px-3 text-body text-ink"
              />
              {errors[f.key] !== undefined && <span className="text-loss">{errors[f.key]}</span>}
            </label>
          ))}
          <Button type="submit">Add network</Button>
        </form>
      </LazySheet>
    </section>
  );
}
