import { lazy, Suspense, useState } from "react";
import type { SheetProps } from "./Sheet";

const Sheet = lazy(async () => ({ default: (await import("./Sheet")).Sheet }));

/**
 * A Sheet whose code, and `motion` with it, loads the first time it opens. For
 * pages that open a sheet rarely. Once loaded it stays mounted, so closing
 * still animates.
 */
export function LazySheet(props: SheetProps) {
  const [wanted, setWanted] = useState(props.open);
  if (props.open && !wanted) setWanted(true);
  if (!wanted) return null;
  return (
    <Suspense fallback={null}>
      <Sheet {...props} />
    </Suspense>
  );
}
