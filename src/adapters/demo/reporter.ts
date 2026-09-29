import type { Reporter } from "../../ports/reporter";

/** Records what would have been reported and prints nothing, for tests and quiet demos. */
export function createSilentReporter(): Reporter & {
  readonly reported: readonly { readonly error: unknown; readonly where: string }[];
} {
  const reported: { error: unknown; where: string }[] = [];
  return {
    reported,
    report: (error, where) => {
      reported.push({ error, where });
    },
  };
}
