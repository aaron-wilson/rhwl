import type { ReactNode } from "react";
import { useOutletContext } from "react-router";

/** Elements the shell builds once and pages place, so page chunks need not import them. */
export interface ShellSlots {
  readonly inboxBell: ReactNode;
  readonly searchButton: ReactNode;
}

/** The shell's slots, or nothing when a page renders outside the shell (tests, the styleguide). */
export function useShellSlots(): Partial<ShellSlots> {
  return useOutletContext<ShellSlots | undefined>() ?? {};
}
