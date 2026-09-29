import { useState } from "react";
import { setThemePreference, useThemePreference, type ThemePreference } from "../../app/theme";
import { Lockup, Mark } from "../../ui/brand/Mark";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { ChartSpecimens } from "./ChartSpecimens";
import { ColorSpecimens } from "./ColorSpecimens";
import { ComponentSpecimens } from "./ComponentSpecimens";
import { ScaleSpecimens } from "./ScaleSpecimens";
import type { Theme } from "./Section";
import { TxSpecimens } from "./TxSpecimens";
import { TypeSpecimens } from "./TypeSpecimens";

const themes: readonly Theme[] = ["light", "dark"];
const preferences: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
const tints = [
  { value: "gain", label: "Gain" },
  { value: "loss", label: "Loss" },
] as const;

/** Every token rendered from token data, in both themes, with measured contrast. */
export function StyleguidePage() {
  const preference = useThemePreference();
  const [tint, setTint] = useState<"gain" | "loss">("gain");

  return (
    <main className="mx-auto flex max-w-wide flex-col gap-6 p-4 sm:p-8" data-tint={tint}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Lockup />
        <div className="flex w-full flex-wrap gap-4 sm:w-auto">
          <SegmentedControl
            label="Theme"
            options={preferences}
            value={preference}
            onChange={setThemePreference}
          />
          <SegmentedControl label="Tint" options={tints} value={tint} onChange={setTint} />
        </div>
      </header>
      <h1 className="text-title1 font-bold">Styleguide</h1>
      <TxSpecimens />
      <ChartSpecimens />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {themes.map((theme) => (
          <div
            key={theme}
            data-theme={theme}
            className="flex flex-col gap-8 rounded-xl border border-line bg-canvas p-4 text-ink sm:p-6"
          >
            <div className="flex items-center gap-3">
              <Mark size={48} />
              <Mark size={32} />
              <Mark size={20} />
              <span className="text-headline font-semibold capitalize">{theme}</span>
            </div>
            <ComponentSpecimens theme={theme} />
            <ColorSpecimens theme={theme} />
            <TypeSpecimens />
            <ScaleSpecimens />
          </div>
        ))}
      </div>
    </main>
  );
}
