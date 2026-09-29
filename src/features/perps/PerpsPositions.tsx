import { Card } from "../../ui/Card";
import { PerpPositionCard } from "./PerpPositionCard";
import type { OpenPosition } from "./perps-store";

interface PerpsPositionsProps {
  readonly positions: readonly OpenPosition[];
  readonly now: Date;
}

/** The account's open perp positions, or an empty note. */
export function PerpsPositions({ positions, now }: PerpsPositionsProps) {
  return (
    <section aria-labelledby="positions" className="flex flex-col gap-2">
      <h2 id="positions" className="px-1 text-footnote font-semibold text-ink-3">
        Positions
      </h2>
      {positions.length === 0 ? (
        <Card className="text-body text-ink-2">No open positions.</Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {positions.map((p) => (
            <li key={p.id}>
              <PerpPositionCard position={p} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
