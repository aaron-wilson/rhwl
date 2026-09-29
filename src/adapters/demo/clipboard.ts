import type { Clipboard } from "../../ports/clipboard";

/** Remembers what was copied instead of touching the system clipboard. */
export function createDemoClipboard(): Clipboard & { readonly copied: readonly string[] } {
  const copied: string[] = [];
  return {
    copied,
    copy: (text) => {
      copied.push(text);
      return Promise.resolve();
    },
  };
}
