/** Time, for the whole app. Presenter mode freezes and fast-forwards it; nothing reads Date.now directly. */
export interface Clock {
  now(): Date;
  /** Runs `fn` once `ms` of clock time has passed. Returns a cancel function. */
  schedule(fn: () => void, ms: number): () => void;
}

/** A clock the demo can steer. */
export interface ControllableClock extends Clock {
  /** Jumps forward, firing every timer that falls due on the way. */
  advance(ms: number): void;
  setFrozen(frozen: boolean): void;
  readonly frozen: boolean;
}
