import { PortError } from "../../ports/errors";
import type { KeyValueStorage } from "../../ports/storage";

/**
 * localStorage (or sessionStorage, for marks that must last one tab only),
 * which can throw in private windows or when full. Reads that fail return
 * nothing; writes that fail raise a PortError the caller may ignore.
 */
export function createBrowserStorage(area: "local" | "session" = "local"): KeyValueStorage {
  const store = (): Storage => (area === "local" ? window.localStorage : window.sessionStorage);
  return {
    get(key) {
      try {
        return store().getItem(key) ?? undefined;
      } catch {
        return undefined;
      }
    },
    set(key, value) {
      try {
        store().setItem(key, value);
      } catch (cause) {
        throw new PortError("storage", "failed", `could not write ${key}`, { cause });
      }
    },
    remove(key) {
      try {
        store().removeItem(key);
      } catch (cause) {
        throw new PortError("storage", "failed", `could not remove ${key}`, { cause });
      }
    },
  };
}
