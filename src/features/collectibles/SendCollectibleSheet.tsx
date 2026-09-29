import { shortAddress } from "../../domain/keys/address";
import type { Collectible } from "../../data/collectibles";
import { useProviders } from "../../app/providers-context";
import { Button } from "../../ui/Button";
import { Sheet } from "../../ui/Sheet";
import { useActiveAccountEntry } from "../accounts";
import { RecipientStep } from "../send";
import { useRecipient } from "../send";
import { sendCollectible } from "./burn";

/** Picks a recipient with the same checks as Send, then sends through the sign sheet. */
export function SendCollectibleSheet({
  item,
  open,
  onClose,
  onSent,
}: {
  readonly item: Collectible;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSent: () => void;
}) {
  const providers = useProviders();
  const field = useRecipient(useActiveAccountEntry(), "");
  const { recipient } = field;

  function send() {
    if (recipient.status !== "ok") return;
    onClose();
    const label = recipient.name ?? shortAddress(recipient.address);
    void sendCollectible(providers, item.id, recipient.address, label).then((sent) => {
      if (sent) onSent();
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Send ${item.name}`}>
      <div className="flex flex-col gap-4">
        <RecipientStep field={field} />
        <Button size="lg" block disabled={!field.ready} onClick={send}>
          Review and send
        </Button>
      </div>
    </Sheet>
  );
}
