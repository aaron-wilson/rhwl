import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { readVerifyQuery } from "../../domain/flex/card";
import { shortAddress } from "../../domain/keys/address";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { FlexCardView } from "./FlexCardView";
import { verifyCard, type Verification } from "./verify-card";

/** Re-checks a shared card's signature from the link alone, with no wallet state. */
export function VerifyPage() {
  const [params] = useSearchParams();
  const [checked, setChecked] = useState<Verification | undefined>(undefined);
  const link = readVerifyQuery(params);
  const text = link?.text;
  const signature = link?.signature;

  useEffect(() => {
    if (text === undefined || signature === undefined) return;
    let live = true;
    void verifyCard(text, signature).then((r) => {
      if (live) setChecked(r);
    });
    return () => {
      live = false;
    };
  }, [text, signature]);

  const result: Verification | undefined = link === undefined ? { status: "malformed" } : checked;

  return (
    <div className="mx-auto flex max-w-phone flex-col gap-6 px-4 pt-6 pb-8">
      <PageHeader title="Verify a card" subtitle="Positions or ban, with receipts" />
      {result === undefined ? (
        <p className="text-body text-ink-2" aria-live="polite">
          Checking the signature…
        </p>
      ) : result.status === "malformed" ? (
        <Card role="alert" className="text-body text-loss">
          This link doesn&apos;t hold a readable card.
        </Card>
      ) : (
        <>
          <p
            role="status"
            data-testid="verify-result"
            className={
              result.status === "valid"
                ? "flex items-center gap-2 text-headline font-semibold text-gain"
                : "flex items-center gap-2 text-headline font-semibold text-loss"
            }
          >
            {result.status === "valid" ? <ShieldCheck {...icon()} /> : <ShieldAlert {...icon()} />}
            {result.status === "valid"
              ? `Verified: signed by ${result.card.accountName}`
              : "Not verified: this card was changed after it was signed"}
          </p>
          <FlexCardView
            card={result.card}
            footer={
              <span className="font-mono">
                {result.signer === undefined ? "no valid signature" : shortAddress(result.signer)}
              </span>
            }
          />
        </>
      )}
    </div>
  );
}
