import { Copy, Share2 } from "lucide-react";
import { useId } from "react";
import { useProviders } from "../../app/providers-context";
import type { Asset } from "../../data/types";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { QrCode } from "../../ui/QrCode";
import { copyWithFeedback, shareWithFeedback } from "./copy-and-share";

export interface ReceiveRequestProps {
  readonly accountName: string;
  readonly asset: Asset;
  readonly requestable: readonly Asset[];
  readonly amountText: string;
  readonly onAmountTextChange: (next: string) => void;
  readonly onAssetChange: (next: string) => void;
  readonly amount: string | undefined;
  readonly link: string | undefined;
}

/** An amount and asset to ask for, as a QR code and a shareable Send link. */
export function ReceiveRequest({
  accountName,
  asset,
  requestable,
  amountText,
  onAmountTextChange,
  onAssetChange,
  amount,
  link,
}: ReceiveRequestProps) {
  const providers = useProviders();
  const amountId = useId();
  const assetFieldId = useId();
  return (
    <section aria-labelledby="request" className="flex flex-col gap-2">
      <h2 id="request" className="px-1 text-footnote font-semibold text-ink-3">
        Request an amount
      </h2>
      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={amountId} className="text-footnote text-ink-3">
              Amount
            </label>
            <input
              id={amountId}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amountText}
              onChange={(event) => {
                onAmountTextChange(event.target.value);
              }}
              className="h-12 rounded-md bg-surface-2 px-3 text-body tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-focus"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={assetFieldId} className="text-footnote text-ink-3">
              Asset
            </label>
            <select
              id={assetFieldId}
              value={asset.id}
              onChange={(event) => {
                onAssetChange(event.target.value);
              }}
              className="h-12 rounded-md bg-surface-2 px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus"
            >
              {requestable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>
        {amountText.trim() !== "" && link === undefined && (
          <p role="alert" className="text-footnote text-loss">
            Enter an amount above zero, with at most {asset.decimals} decimal places.
          </p>
        )}
        {link !== undefined && amount !== undefined && (
          <div className="flex flex-col items-center gap-3" data-testid="request-link">
            <QrCode
              value={link}
              label={`QR code requesting ${amount} ${asset.symbol}`}
              className="w-full max-w-48"
            />
            <p className="text-center text-footnote text-ink-2">
              Opens Send with {amount} {asset.symbol} to {accountName} filled in.
            </p>
            <div className="flex w-full flex-wrap gap-2">
              <Button
                variant="secondary"
                className="flex-1 whitespace-nowrap"
                icon={<Copy {...icon()} />}
                onClick={() => void copyWithFeedback(providers, link, "Link")}
              >
                Copy link
              </Button>
              <Button
                variant="secondary"
                className="flex-1 whitespace-nowrap"
                icon={<Share2 {...icon()} />}
                onClick={() =>
                  void shareWithFeedback(
                    providers,
                    {
                      title: `Send ${amount} ${asset.symbol} to ${accountName}`,
                      text: `Send ${amount} ${asset.symbol} to ${accountName}`,
                      url: link,
                    },
                    "Link",
                  )
                }
              >
                Share link
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
