import {
  color,
  contrastPairs,
  splash,
  splashContrastBg,
  splashContrastMin,
  tintAliases,
} from "../../tokens/color";
import { contrastRatio } from "../../tokens/contrast";
import { Section, type Theme } from "./Section";

function Swatch({ name }: { readonly name: string }) {
  return (
    <span
      className="size-10 shrink-0 rounded-sm border border-line"
      style={{ backgroundColor: `var(--rh-color-${name})` }}
    />
  );
}

function Ratio({ value, min }: { readonly value: number; readonly min: number }) {
  const pass = value >= min;
  return (
    <span
      className={`rounded-full px-2 text-footnote font-semibold tabular-nums ${
        pass ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"
      }`}
    >
      {value.toFixed(2)}:1 {pass ? "pass" : "fail"}
    </span>
  );
}

export function ColorSpecimens({ theme }: { readonly theme: Theme }) {
  return (
    <>
      <Section title="Color roles">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(color).map(([name, value]) => (
            <li key={name} className="flex items-center gap-3">
              <Swatch name={name} />
              <span className="flex flex-col">
                <span className="font-semibold">{name}</span>
                <span className="text-footnote text-ink-3">
                  {value[theme]} · {value.note}
                </span>
              </span>
            </li>
          ))}
          {Object.entries(tintAliases).map(([name, target]) => (
            <li key={name} className="flex items-center gap-3">
              <Swatch name={name} />
              <span className="flex flex-col">
                <span className="font-semibold">{name}</span>
                <span className="text-footnote text-ink-3">
                  Market tint: {target.gain} or {target.loss}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Contrast">
        <ul className="flex flex-col gap-2">
          {contrastPairs.map((pair) => (
            <li
              key={`${pair.fg}-${pair.bg}`}
              className="flex items-center justify-between gap-3 rounded-sm px-3 py-2"
              style={{
                color: `var(--rh-color-${pair.fg})`,
                backgroundColor: `var(--rh-color-${pair.bg})`,
              }}
            >
              <span>
                {pair.use}{" "}
                <span>
                  · {pair.fg} on {pair.bg}
                </span>
              </span>
              <Ratio
                value={contrastRatio(color[pair.fg][theme], color[pair.bg][theme])}
                min={pair.min}
              />
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Splash (content only)">
        <ul className="flex flex-wrap gap-2">
          {Object.entries(splash).map(([name, value]) => (
            <li
              key={name}
              className="flex items-center gap-2 rounded-full bg-surface px-3 py-1 font-semibold"
              style={{ color: `var(--rh-color-splash-${name})` }}
            >
              {value.note}
              <Ratio
                value={contrastRatio(value[theme], color[splashContrastBg][theme])}
                min={splashContrastMin}
              />
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
