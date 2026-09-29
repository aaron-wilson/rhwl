import { text, weight } from "../../tokens/scale";
import { Section } from "./Section";

const samples: Readonly<Record<string, string>> = {
  display: "$48,213.07",
  large: "NVDA",
  title1: "Good evening, you.rh",
  title2: "Stock Tokens",
  title3: "Weekend gap +1.8%",
  headline: "Review swap",
  body: "NVDA trades 24/7 here. NYSE opens in 2h 14m.",
  footnote: "Gas paid in USDG · about $0.004",
  caption: "Simulated data · not affiliated with Robinhood",
};

export function TypeSpecimens() {
  return (
    <Section title="Type">
      <ul className="flex flex-col gap-4">
        {Object.entries(text).map(([name, spec]) => (
          <li key={name} className="flex flex-col">
            <span className="text-caption text-ink-3">
              {name} · {spec.size}/{spec.line} · tracking {spec.tracking}em
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: `${spec.size}px`,
                lineHeight: `${spec.line}px`,
                letterSpacing: `${spec.tracking}em`,
              }}
            >
              {samples[name] ?? name}
            </span>
          </li>
        ))}
      </ul>
      <ul className="flex gap-4">
        {Object.entries(weight).map(([name, value]) => (
          <li key={name} style={{ fontWeight: value }}>
            {name} {value}
          </li>
        ))}
      </ul>
    </Section>
  );
}
