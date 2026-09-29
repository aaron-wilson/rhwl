import { useState } from "react";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Slider } from "../../ui/Slider";
import { Switch } from "../../ui/Switch";
import { Tabs } from "../../ui/Tabs";
import { Section, type Theme } from "./Section";

const ranges = ["1D", "1W", "1M", "1Y", "ALL"] as const;
type Range = (typeof ranges)[number];
const tabs = [
  { value: "tokens", label: "Tokens" },
  { value: "stocks", label: "Stocks" },
  { value: "activity", label: "Activity" },
] as const;
type Tab = (typeof tabs)[number]["value"];

export function ControlSpecimens({ theme }: { readonly theme: Theme }) {
  const [range, setRange] = useState<Range>("1D");
  const [tab, setTab] = useState<Tab>("tokens");
  const [guard, setGuard] = useState(true);
  const [leverage, setLeverage] = useState(5);
  return (
    <Section title="Controls">
      <SegmentedControl
        label={`Chart range (${theme})`}
        options={ranges.map((value) => ({ value, label: value }))}
        value={range}
        onChange={setRange}
      />
      <Tabs label={`Portfolio sections (${theme})`} tabs={tabs} value={tab} onChange={setTab} />
      <Switch
        label="Degen guardrails"
        description="Weekly meme budget of $250"
        checked={guard}
        onChange={setGuard}
      />
      <Switch
        label="Hardware signing"
        description="Connect a device first"
        checked={false}
        onChange={setGuard}
        disabled
      />
      <Slider
        label="Leverage"
        value={leverage}
        min={1}
        max={20}
        marks={[1, 5, 10, 20]}
        format={(v) => `${v}x`}
        onChange={setLeverage}
      />
    </Section>
  );
}
