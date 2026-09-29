import { Rocket } from "lucide-react";
import { spring } from "../../tokens/motion";
import {
  blur,
  duration,
  easing,
  iconSize,
  iconStroke,
  radius,
  shadow,
  space,
} from "../../tokens/scale";
import { Section } from "./Section";

export function ScaleSpecimens() {
  return (
    <>
      <Section title="Space">
        <ul className="flex flex-col gap-1">
          {Object.entries(space).map(([name, px]) => (
            <li key={name} className="flex items-center gap-3 text-footnote">
              <span className="w-10 text-ink-3 tabular-nums">{name}</span>
              <span className="h-3 rounded-xs bg-accent" style={{ width: `${px}px` }} />
              <span className="text-ink-2 tabular-nums">{px}px</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Radius and shadow">
        <ul className="flex flex-wrap gap-4">
          {Object.entries(radius).map(([name, px]) => (
            <li
              key={name}
              className="flex size-20 items-end border border-line bg-surface p-2 text-caption text-ink-2"
              style={{ borderRadius: `var(--rh-radius-${name})` }}
            >
              {name} {px === 9999 ? "pill" : `${px}px`}
            </li>
          ))}
          {Object.keys(shadow).map((name) => (
            <li
              key={name}
              className="flex size-20 items-end rounded-md bg-surface p-2 text-caption text-ink-2"
              style={{ boxShadow: `var(--rh-shadow-${name})` }}
            >
              shadow {name}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Motion (hover or focus a row)">
        <ul className="flex flex-col gap-2">
          {Object.entries(duration).flatMap(([d, ms]) =>
            Object.entries(easing).map(([e, curve]) => (
              <li
                key={`${d}-${e}`}
                tabIndex={0}
                className="group flex items-center gap-3 rounded-sm bg-surface-2 p-2 text-footnote"
              >
                <span className="w-40 text-ink-2">
                  {d} {ms}ms · {e}
                </span>
                <span
                  className="size-4 rounded-full bg-accent group-hover:translate-x-24 group-focus:translate-x-24"
                  style={{ transition: `transform ${ms}ms ${curve}` }}
                  title={curve}
                />
              </li>
            )),
          )}
        </ul>
      </Section>
      <Section title="Icons and springs">
        <ul className="flex items-end gap-6 text-footnote text-ink-2">
          {Object.entries(iconSize).map(([name, px]) => (
            <li key={name} className="flex flex-col items-center gap-1">
              <Rocket size={px} strokeWidth={iconStroke} aria-hidden="true" />
              {name} {px}px
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-1 text-footnote text-ink-2">
          {Object.entries(spring).map(([name, preset]) => (
            <li key={name}>
              spring {name} · stiffness {preset.stiffness} · damping {preset.damping}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Blur">
        <div className="relative h-24 overflow-hidden rounded-md">
          <div className="absolute inset-0 flex items-center justify-around text-title1 font-bold">
            <span className="text-splash-pink">NVDA</span>
            <span className="text-splash-sky">ETH</span>
            <span className="text-splash-lime">USDG</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-chrome p-3 text-footnote backdrop-blur-chrome">
            chrome blur {blur.chrome}px · tab bar, sheet scrim, pending island
          </div>
        </div>
      </Section>
    </>
  );
}
