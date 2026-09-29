import { Copy, Share2 } from "lucide-react";
import { useProviders } from "../../app/providers-context";
import type { Chain } from "../../data/types";
import { addressUri } from "../../domain/receive/links";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { QrCode } from "../../ui/QrCode";
import { copyWithFeedback, shareWithFeedback } from "./copy-and-share";

export interface ReceiveQrProps {
  readonly accountName: string;
  readonly chain: Chain;
  readonly address: string;
}

/** The address as a QR code and text, with copy and share. */
export function ReceiveQr({ accountName, chain, address }: ReceiveQrProps) {
  const providers = useProviders();
  return (
    <Card className="flex flex-col items-center gap-4">
      <QrCode
        value={addressUri(chain, address)}
        label={`QR code for ${accountName}'s ${chain.name} address`}
        className="w-full max-w-64"
      />
      <p
        className="text-center font-mono text-footnote break-all text-ink-2"
        data-testid="receive-address"
      >
        {address}
      </p>
      <div className="flex w-full flex-wrap gap-2">
        <Button
          variant="secondary"
          className="flex-1 whitespace-nowrap"
          icon={<Copy {...icon()} />}
          onClick={() => void copyWithFeedback(providers, address, "Address")}
        >
          Copy
        </Button>
        <Button
          variant="secondary"
          className="flex-1 whitespace-nowrap"
          icon={<Share2 {...icon()} />}
          onClick={() =>
            void shareWithFeedback(
              providers,
              { title: `${accountName} on ${chain.name}`, text: address },
              "Address",
            )
          }
        >
          Share
        </Button>
      </div>
    </Card>
  );
}
