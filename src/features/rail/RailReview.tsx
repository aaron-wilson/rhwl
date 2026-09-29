import { ArrowDownUp } from "lucide-react";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import type { TransferDirection } from "./RailDirection";

export interface RailReviewProps {
  readonly direction: TransferDirection;
  readonly disabled: boolean;
  readonly moving: boolean;
  readonly onMove: () => void;
  readonly onUnlink: () => void;
}

/** What happens next for the chosen direction, and the buttons that do it. */
export function RailReview({ direction, disabled, moving, onMove, onUnlink }: RailReviewProps) {
  return (
    <>
      <p className="px-1 text-caption text-ink-3">
        {direction === "deposit"
          ? "Robinhood sends it; it arrives in seconds and you sign nothing. Once here, only you can move it."
          : "You sign this like any send. Robinhood credits your account once it confirms."}
      </p>
      <Button
        size="lg"
        block
        icon={<ArrowDownUp {...icon()} />}
        disabled={disabled}
        loading={moving}
        onClick={onMove}
      >
        {direction === "deposit" ? "Move to wallet" : "Move to Robinhood"}
      </Button>
      <Button variant="ghost" onClick={onUnlink}>
        Unlink account
      </Button>
    </>
  );
}
