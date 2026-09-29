import { formatFiat } from "../../domain/money/format";
import { valueAtShock } from "../../domain/whatif";
import { Private } from "../privacy";
import { WhatIfSlider } from "./WhatIfSlider";

/** What an order would be worth after a shock to `subject`. */
export function ValueWhatIf({
  subject,
  valueCents,
  assumption,
}: {
  readonly subject: string;
  readonly valueCents: bigint;
  /** Said when the outcome rests on one, e.g. "if the pair holds". */
  readonly assumption?: string;
}) {
  return (
    <WhatIfSlider
      subject={subject}
      outcome={(bps) => {
        const after = valueAtShock(valueCents, bps);
        return (
          <span>
            Worth <Private>{formatFiat(after)}</Private> (
            <span className={after >= valueCents ? "text-gain" : "text-loss"}>
              <Private>{formatFiat(after - valueCents, "always")}</Private>
            </span>
            ){assumption === undefined ? "" : `, ${assumption}`}.
          </span>
        );
      }}
    />
  );
}
