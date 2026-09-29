import { createRandom, randomAt } from "../../lib/prng";
import type { Amount } from "../money/amount";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Holder badges by how long the current position has been held without selling out. */
export const badges = [
  { minDays: 90, name: "Legend" },
  { minDays: 30, name: "Diamond hands" },
  { minDays: 7, name: "Steady hands" },
  { minDays: 0, name: "New holder" },
] as const;

export type BadgeName = (typeof badges)[number]["name"];

export function badgeFor(heldMs: number): BadgeName {
  const days = heldMs / DAY_MS;
  return badges.find((b) => days >= b.minDays)?.name ?? "New holder";
}

/**
 * When the current, unbroken holding began: after the last time the balance
 * reached zero. Whatever history doesn't explain was held from `openedAt`.
 * Undefined when nothing is held.
 */
export function holdingSince(
  held: Amount,
  history: readonly { readonly at: Date; readonly quantity: Amount }[],
  openedAt: Date,
): Date | undefined {
  if (held.base <= 0n) return undefined;
  const sorted = [...history].sort((a, b) => a.at.getTime() - b.at.getTime());
  let balance = held.base - sorted.reduce((sum, c) => sum + c.quantity.base, 0n);
  let since: Date | undefined = balance > 0n ? openedAt : undefined;
  for (const change of sorted) {
    const was = balance;
    balance += change.quantity.base;
    if (was <= 0n && balance > 0n) since = change.at;
    if (balance <= 0n) since = undefined;
  }
  return since;
}

export interface RoomMessage {
  readonly id: string;
  readonly at: Date;
  readonly handle: string;
  readonly text: string;
  readonly mood: "bull" | "bear";
}

const HANDLES = [
  "stonk_otter",
  "dip_heron",
  "theta_toad",
  "gap_gecko",
  "candle_crow",
  "hodl_hare",
  "limit_lynx",
  "yolo_yak",
];
const BULL = [
  "Holding {T} into the close. Diamond hands.",
  "Added a little more {T} on the dip.",
  "Tendies are a state of mind. Still holding {T}.",
  "Not selling. Not even a little.",
  "{T} premium over last close looks healthy tonight.",
  "Paired memes on {T} are waking up again.",
];
const BEAR = [
  "Trimmed some {T}, taking the win.",
  "That {T} candle was rough.",
  "Sitting in USDG until the open.",
  "Stop loss hit on {T}. Back tomorrow.",
  "Weekend gap could go either way for {T}.",
];

/** A message may arrive in each 90-second slot. */
export const SLOT_MS = 90_000;

/**
 * The room's scripted chat: deterministic from the seed, ticker and time, so the
 * same moment always shows the same messages. Newest first, at most `limit`.
 */
export function roomMessages(seed: string, ticker: string, now: Date, limit = 25): RoomMessage[] {
  const out: RoomMessage[] = [];
  let slot = Math.floor(now.getTime() / SLOT_MS);
  for (let scanned = 0; out.length < limit && scanned < limit * 8; scanned += 1, slot -= 1) {
    const key = `${seed}:${ticker}:${slot}`;
    if (randomAt(key) >= 0.45) continue;
    const r = createRandom(`${key}:m`);
    const at = new Date(slot * SLOT_MS + Math.floor(r() * SLOT_MS));
    if (at > now) continue;
    const mood = r() < 0.6 ? "bull" : "bear";
    const lines = mood === "bull" ? BULL : BEAR;
    out.push({
      id: key,
      at,
      handle: HANDLES[Math.floor(r() * HANDLES.length)] ?? "stonk_otter",
      text: (lines[Math.floor(r() * lines.length)] ?? "").replaceAll("{T}", ticker),
      mood,
    });
  }
  return out;
}

/** Share of messages that are bullish, in basis points. */
export function sentimentBps(messages: readonly RoomMessage[]): number {
  if (messages.length === 0) return 5_000;
  return Math.round((messages.filter((m) => m.mood === "bull").length * 10_000) / messages.length);
}
