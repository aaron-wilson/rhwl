/** Levers only a demo world has. Presenter mode and the styleguide use them; production has none. */
export interface DemoControls {
  failNextTransaction(reason: string): void;
  /** Jumps the demo clock forward, firing timers on the way. A no-op on a real clock. */
  advanceClock(ms: number): void;
  /** Lets a frozen demo clock run at real speed from where it stands. */
  resumeClock(): void;
}
