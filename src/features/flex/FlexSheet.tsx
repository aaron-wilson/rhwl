import { Download, Share2 } from "lucide-react";
import { useState } from "react";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import type { Asset } from "../../data/types";
import { encodeCard, verifyQuery, type FlexCard } from "../../domain/flex/card";
import { amount } from "../../domain/money/amount";
import { formatPercentBps } from "../../domain/money/format";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import { Sheet } from "../../ui/Sheet";
import { useActiveAccountEntry } from "../accounts";
import type { PositionView } from "../asset";
import { useBalancesHidden } from "../privacy";
import { signMessageAs } from "../transactions/actions";
import { downloadBlob } from "../../lib/download";
import { renderCardPng } from "./card-image";
import { FlexCardView } from "./FlexCardView";

/** Builds a card from the position, signs it with the wallet, and shares a link anyone can verify. */
export function FlexSheet({
  asset,
  position,
  onClose,
}: {
  readonly asset: Asset;
  readonly position: PositionView;
  readonly onClose: () => void;
}) {
  const { market, share } = useProviders();
  const account = useActiveAccountEntry();
  const hidden = useBalancesHidden();
  const now = useNow();
  const [frozen] = useState(now);
  const [link, setLink] = useState<string | undefined>(undefined);
  const [signing, setSigning] = useState(false);
  if (account === undefined) return null;

  const card: FlexCard = {
    account: account.id,
    accountName: account.name,
    assetId: asset.id,
    symbol: asset.symbol,
    pnlBps: position.pnl.bps,
    pnlCents: hidden ? undefined : position.pnl.cents,
    entry: position.averagePrice ?? amount(0n, 8),
    mark: market.price(asset.id, frozen),
    at: frozen,
  };

  async function sign() {
    const text = encodeCard(card);
    setSigning(true);
    const signed = await signMessageAs(card.account, {
      payload: text,
      display: `I held ${card.symbol} at ${formatPercentBps(card.pnlBps)} on ${card.at.toISOString()}.\n\n${text}`,
    });
    setSigning(false);
    if (signed !== undefined) {
      setLink(
        new URL(`/verify?${verifyQuery(signed.payload, signed.signature)}`, window.location.href)
          .href,
      );
    }
  }

  const fileName = `${card.symbol}-${card.at.toISOString().slice(0, 10)}.png`;

  async function shareCard(url: string) {
    const png = await renderCardPng(card);
    const image = new File([png], fileName, { type: "image/png" });
    const shared = await share
      .share({
        title: `${card.symbol} ${formatPercentBps(card.pnlBps)}`,
        text: `My ${card.symbol} position, signed. Verify it:`,
        url,
        files: [image],
      })
      .then(() => true)
      .catch(() => false);
    if (!shared) downloadBlob(png, fileName);
  }

  async function saveImage() {
    downloadBlob(await renderCardPng(card), fileName);
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Positions or ban"
      description="Signed, so it can't be faked"
    >
      <div className="flex flex-col gap-4">
        <FlexCardView
          card={card}
          footer={<span>{link === undefined ? "Unsigned" : "Signed by your wallet"}</span>}
        />
        {hidden && (
          <p className="text-footnote text-ink-3">
            Balances are hidden, so the card shows the percentage only.
          </p>
        )}
        {link === undefined ? (
          <Button size="lg" block loading={signing} onClick={() => void sign()}>
            Sign card
          </Button>
        ) : (
          <>
            <a
              href={link}
              className="truncate text-footnote text-accent underline"
              data-testid="verify-link"
            >
              {link}
            </a>
            <Button
              size="lg"
              block
              icon={<Share2 {...icon()} />}
              onClick={() => {
                void shareCard(link);
              }}
            >
              Share card
            </Button>
            <Button
              variant="secondary"
              block
              icon={<Download {...icon()} />}
              onClick={() => {
                void saveImage();
              }}
            >
              Save image
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
