/** "0x8f3a41…c21e" → "0x8f3a…c21e": enough to recognize, short enough for a row. */
export function shortAddress(address: string): string {
  return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;
}
