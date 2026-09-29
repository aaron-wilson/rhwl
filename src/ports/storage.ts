/** Small synchronous key-value storage for preferences and the demo snapshot. */
export interface KeyValueStorage {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}
