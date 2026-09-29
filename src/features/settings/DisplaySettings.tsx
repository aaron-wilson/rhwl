import { useHapticsOn, useHideSmall, hapticsOnStore, hideSmallStore } from "../../app/preferences";
import { setThemePreference, useThemePreference, type ThemePreference } from "../../app/theme";
import { displayCurrencyStore, type Currency } from "../../domain/money/display";
import { useStore } from "../../lib/store";
import { Card } from "../../ui/Card";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Switch } from "../../ui/Switch";
import { setBalancesHidden, useBalancesHidden } from "../privacy";

const themes: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
const currencies: readonly { value: Currency; label: string }[] = [
  { value: "USD", label: "USD $" },
  { value: "EUR", label: "EUR €" },
  { value: "GBP", label: "GBP £" },
];

/** Appearance, money display and feedback: every preference that survives Reset demo. */
export function DisplaySettings() {
  const theme = useThemePreference();
  const currency = useStore(displayCurrencyStore);
  const hidden = useBalancesHidden();
  const hideSmall = useHideSmall();
  const haptics = useHapticsOn();
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-footnote font-semibold text-ink-3">Display</h2>
      <Card className="flex flex-col gap-4">
        <SegmentedControl
          label="Theme"
          options={themes}
          value={theme}
          onChange={setThemePreference}
        />
        <div className="flex flex-col gap-1">
          <SegmentedControl
            label="Currency"
            options={currencies}
            value={currency}
            onChange={(next) => {
              displayCurrencyStore.set(next);
            }}
          />
          <p className="px-1 text-footnote text-ink-2">
            Converted from US dollars at fixed demo rates. Amounts you type stay in dollars.
          </p>
        </div>
        <Switch
          label="Hide balances"
          description="Tap your total on Home to toggle quickly"
          checked={hidden}
          onChange={setBalancesHidden}
        />
        <Switch
          label="Hide small balances"
          description="Leave holdings worth under $1 off Home"
          checked={hideSmall}
          onChange={(on) => {
            hideSmallStore.set(on);
          }}
        />
        <Switch
          label="Haptics"
          description="A light buzz when you sign and when things confirm"
          checked={haptics}
          onChange={(on) => {
            hapticsOnStore.set(on);
          }}
        />
      </Card>
    </section>
  );
}
