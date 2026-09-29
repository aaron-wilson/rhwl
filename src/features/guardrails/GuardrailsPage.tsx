import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Switch } from "../../ui/Switch";
import { GuardrailsStatus } from "./GuardrailsStatus";
import { setGuardrails, useGuardrails } from "./guardrails-store";
import {
  budgetOptions,
  coolOffOptions,
  defaults,
  leverageOptions,
  sleepDelayOptions,
  sleepThresholdOptions,
  without,
} from "./rule-options";

function Rule({
  label,
  description,
  on,
  onToggle,
  children,
}: {
  readonly label: string;
  readonly description: string;
  readonly on: boolean;
  readonly onToggle: (on: boolean) => void;
  readonly children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <Switch label={label} description={description} checked={on} onChange={onToggle} />
      {on && children}
    </Card>
  );
}

/** Limits the user sets on themself, enforced on every trade before the signature. */
export function GuardrailsPage() {
  const rails = useGuardrails();
  const toggle = (key: keyof typeof defaults) => (on: boolean) => {
    setGuardrails((r) => (on ? { ...r, [key]: defaults[key] } : without(r, key)));
  };
  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/settings"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Settings
      </Link>
      <PageHeader
        title="Guardrails"
        subtitle="Your rules, checked on every trade before you sign"
      />
      <GuardrailsStatus />
      <Rule
        label="Weekly meme budget"
        description="Most that goes into memes in any seven days"
        on={rails.memeBudgetCents !== undefined}
        onToggle={toggle("memeBudgetCents")}
      >
        <SegmentedControl
          label="Meme budget"
          options={budgetOptions}
          value={String(rails.memeBudgetCents ?? defaults.memeBudgetCents)}
          onChange={(v) => {
            setGuardrails((r) => ({ ...r, memeBudgetCents: BigInt(v) }));
          }}
        />
      </Rule>
      <Rule
        label="Leverage cap"
        description="Highest leverage a new perp position may use"
        on={rails.maxLeverage !== undefined}
        onToggle={toggle("maxLeverage")}
      >
        <SegmentedControl
          label="Maximum leverage"
          options={leverageOptions}
          value={String(rails.maxLeverage ?? defaults.maxLeverage)}
          onChange={(v) => {
            setGuardrails((r) => ({ ...r, maxLeverage: Number(v) }));
          }}
        />
      </Rule>
      <Rule
        label="Sleep on it"
        description="Big trades wait before you can sign"
        on={rails.sleepOnIt !== undefined}
        onToggle={toggle("sleepOnIt")}
      >
        <SegmentedControl
          label="Trades over"
          options={sleepThresholdOptions}
          value={String((rails.sleepOnIt ?? defaults.sleepOnIt).thresholdCents)}
          onChange={(v) => {
            setGuardrails((r) => ({
              ...r,
              sleepOnIt: { ...(r.sleepOnIt ?? defaults.sleepOnIt), thresholdCents: BigInt(v) },
            }));
          }}
        />
        <SegmentedControl
          label="Wait"
          options={sleepDelayOptions}
          value={String((rails.sleepOnIt ?? defaults.sleepOnIt).delayMs)}
          onChange={(v) => {
            setGuardrails((r) => ({
              ...r,
              sleepOnIt: { ...(r.sleepOnIt ?? defaults.sleepOnIt), delayMs: Number(v) },
            }));
          }}
        />
      </Rule>
      <Rule
        label="Cool-off"
        description="After three losing trades in a row, new trades pause"
        on={rails.coolOff !== undefined}
        onToggle={toggle("coolOff")}
      >
        <SegmentedControl
          label="Pause for"
          options={coolOffOptions}
          value={String((rails.coolOff ?? defaults.coolOff).ms)}
          onChange={(v) => {
            setGuardrails((r) => ({ ...r, coolOff: { losses: 3, ms: Number(v) } }));
          }}
        />
      </Rule>
      <p className="px-1 text-caption text-ink-3">
        Selling and closing positions are never held back. Limits apply to this wallet only.
      </p>
    </div>
  );
}
