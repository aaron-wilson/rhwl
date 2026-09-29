import { hapticsOnStore } from "../../app/preferences";
import type { HapticKind, Haptics } from "../../ports/haptics";
import { showToast } from "../../ui/toast";
import { balancesHiddenStore } from "../privacy";
import { txEvents } from "./tx-events";
import { txTitleText } from "./tx-title";

/** Turns transaction events into a toast and a buzz. Registered once per session. */
export function registerTxFeedback(haptics: Haptics): () => void {
  // The haptics preference is read on each event, so switching it off takes effect at once.
  const buzz = (kind: HapticKind) => {
    if (hapticsOnStore.get()) haptics.play(kind);
  };
  return txEvents.subscribe((event) => {
    const title = txTitleText(event.request.summary, { hidden: balancesHiddenStore.get() });
    if (event.type === "signed") {
      buzz("light");
    } else if (event.type === "held") {
      buzz(event.until === undefined ? "error" : "light");
      showToast(event.reasons.join(" "), event.until === undefined ? "error" : "live");
    } else if (event.type === "confirmed") {
      buzz("success");
      showToast(`${title} confirmed`, "success");
    } else {
      buzz("error");
      showToast(`${title} failed`, "error");
    }
  });
}
