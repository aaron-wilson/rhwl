import type { Clipboard } from "../../ports/clipboard";
import { PortError } from "../../ports/errors";

export function createBrowserClipboard(): Clipboard {
  return {
    async copy(text) {
      // Missing outside secure contexts, whatever the DOM types say.
      if (!("clipboard" in navigator)) {
        throw new PortError("clipboard", "unavailable", "no clipboard in this browser");
      }
      try {
        await navigator.clipboard.writeText(text);
      } catch (cause) {
        throw new PortError("clipboard", "denied", "the browser refused the copy", { cause });
      }
    },
  };
}
