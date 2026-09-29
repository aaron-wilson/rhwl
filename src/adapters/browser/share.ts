import { PortError } from "../../ports/errors";
import type { Share } from "../../ports/share";

export function createBrowserShare(): Share {
  return {
    async share(payload) {
      if (typeof navigator.share === "function") {
        const { files = [], ...rest } = payload;
        const withFiles =
          files.length > 0 && navigator.canShare({ files: [...files] })
            ? { ...rest, files: [...files] }
            : rest;
        try {
          await navigator.share(withFiles);
          return "shared";
        } catch (cause) {
          if (cause instanceof DOMException && cause.name === "AbortError") return "cancelled";
          throw new PortError("share", "failed", "the share sheet failed", { cause });
        }
      }
      try {
        await navigator.clipboard.writeText([payload.text, payload.url].filter(Boolean).join(" "));
        return "copied";
      } catch (cause) {
        throw new PortError("share", "unavailable", "no share sheet or clipboard", { cause });
      }
    },
  };
}
