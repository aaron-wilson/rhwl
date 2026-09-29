import { PortError } from "../../ports/errors";
import type { Providers } from "../../ports/providers";
import { showToast } from "../../ui/toast";

type Deps = Pick<Providers, "clipboard" | "haptics" | "share">;

/** Copies with a tap of haptics and a toast; says so plainly when the browser refuses. */
export async function copyWithFeedback(deps: Deps, text: string, what: string): Promise<void> {
  try {
    await deps.clipboard.copy(text);
    deps.haptics.play("success");
    showToast(`${what} copied`, "success");
  } catch (error) {
    if (!(error instanceof PortError)) throw error;
    deps.haptics.play("error");
    showToast(`Couldn't copy. Select the ${what.toLowerCase()} and copy it yourself.`, "error");
  }
}

/** Opens the share sheet; a clipboard fallback gets the same confirmation as Copy. */
export async function shareWithFeedback(
  deps: Deps,
  payload: { title: string; text: string; url?: string },
  what: string,
): Promise<void> {
  try {
    const result = await deps.share.share(payload);
    if (result === "copied") showToast(`${what} copied`, "success");
  } catch (error) {
    if (!(error instanceof PortError)) throw error;
    showToast(`Couldn't share. Copy the ${what.toLowerCase()} instead.`, "error");
  }
}
