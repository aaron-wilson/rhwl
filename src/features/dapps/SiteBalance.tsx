import { useState } from "react";
import { assetById } from "../../data/assets";
import { formatToken } from "../../domain/money/format";
import { amount } from "../../domain/money/amount";
import { Button } from "../../ui/Button";
import { Private } from "../privacy";
import { useHoldings } from "../transactions";

const USDG = "rh:USDG";

/** What a connected site does with "see your balances": read one, never move it. */
export function SiteBalance({ account }: { readonly account: string }) {
  const holdings = useHoldings(account);
  const [shown, setShown] = useState(false);
  const asset = assetById(USDG);
  const held = holdings.find((h) => h.assetId === USDG)?.quantity ?? amount(0n, asset.decimals);
  if (!shown) {
    return (
      <Button
        variant="secondary"
        onClick={() => {
          setShown(true);
        }}
      >
        Check my USDG
      </Button>
    );
  }
  return (
    <p className="text-body" data-testid="site-balance">
      This site sees <Private>{formatToken(held, asset.symbol)}</Private> in your wallet.
    </p>
  );
}
