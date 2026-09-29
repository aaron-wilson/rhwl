import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { useProviders } from "../../app/providers-context";
import type { Speed } from "../../domain/fees/gas";
import { useHoldings } from "./balances";
import { feeOptions, spendSponsorship, useSponsoredLeft } from "./fee-options";
import { assetById } from "../../data/assets";
import { formatToken } from "../../domain/money/format";
import { icon } from "../../ui/icon";
import { ListRow } from "../../ui/ListRow";
import { Sheet } from "../../ui/Sheet";
import { TokenIcon } from "../../ui/TokenIcon";
import { Private } from "../privacy";
import { FeePicker } from "./FeePicker";
import { Findings } from "./Findings";
import { SignConfirm } from "./SignConfirm";
import type { TxSignRequest } from "./signer";
import { TxTitle } from "./TxTitle";

/**
 * The sign moment every transaction passes through: what changes, what the
 * dry run flagged, and a passkey scan. Loaded only when a signature is asked for.
 */
export function SignSheet({ pending }: { readonly pending: TxSignRequest }) {
  const [speed, setSpeed] = useState<Speed>("standard");
  const [optionId, setOptionId] = useState("rh:ETH");
  const { request, simulation, resolve, mode, account } = pending;
  const { market, clock } = useProviders();
  const holdings = useHoldings(account);
  const sponsoredLeft = useSponsoredLeft();
  const options = feeOptions({
    request,
    speed,
    holdings,
    market,
    now: clock.now(),
    sponsoredLeft,
  });
  const option = options.find((o) => o.id === optionId) ?? options.find((o) => o.id === "rh:ETH");
  const fee = option?.fee ?? request.fee;
  const feeAsset = assetById(fee.assetId);
  const approve = () => {
    if (option === undefined || (option.id === "rh:ETH" && speed === "standard")) {
      resolve(true);
      return;
    }
    if (option.sponsored) spendSponsorship();
    resolve({ fee: option.fee });
  };
  const hardware = mode.kind === "hardware";
  const title = hardware ? "Confirm on device" : "Confirm with passkey";
  return (
    <Sheet
      open
      onClose={() => {
        resolve(false);
      }}
      title={title}
      description={
        hardware ? `Review and approve on your ${mode.device}` : "Simulated before signing"
      }
    >
      <div className="flex flex-col gap-4">
        {request.requestedBy !== undefined && (
          <p className="text-footnote text-ink-2">Requested by {request.requestedBy}</p>
        )}
        <p className="text-headline font-semibold">
          <TxTitle summary={request.summary} />
        </p>
        {request.legs !== undefined && (
          <ol
            aria-label={`${request.legs.length} steps, one signature`}
            className="flex list-decimal flex-col gap-1 pl-5 text-footnote text-ink-2"
          >
            {request.legs.map((leg, i) => (
              <li key={i}>
                <TxTitle summary={leg.summary} />
              </li>
            ))}
          </ol>
        )}
        <ul aria-label="Balance changes" className="flex flex-col">
          {request.deltas
            .filter((delta) => delta.quantity.base !== 0n)
            .map((delta) => {
              const asset = assetById(delta.assetId);
              return (
                <li key={delta.assetId}>
                  <ListRow
                    leading={<TokenIcon symbol={asset.symbol} splash={asset.splash} size="sm" />}
                    title={asset.name}
                    trailing={
                      <span className={delta.quantity.base < 0n ? "text-ink" : "text-gain"}>
                        <Private>{formatToken(delta.quantity, asset.symbol, "always")}</Private>
                      </span>
                    }
                  />
                </li>
              );
            })}
          {(fee.quantity.base !== 0n || option?.sponsored === true) && (
            <li>
              <ListRow
                leading={<TokenIcon symbol={feeAsset.symbol} splash={feeAsset.splash} size="sm" />}
                title="Network fee"
                subtitle={option?.sponsored === true ? "Covered by Robinhood" : undefined}
                trailing={
                  <span data-testid="sign-fee">
                    {option?.sponsored === true
                      ? "Free"
                      : formatToken(fee.quantity, feeAsset.symbol, "always")}
                  </span>
                }
              />
            </li>
          )}
          {request.collectibles?.map((item) => (
            <li key={item.id}>
              <ListRow
                leading={<ImageIcon {...icon()} className="mx-2 text-ink-3" />}
                title={item.name}
                subtitle="Collectible"
                trailing="Leaves your wallet"
              />
            </li>
          ))}
        </ul>
        {options.length > 0 && (
          <FeePicker
            options={options}
            option={option}
            speed={speed}
            onSpeed={setSpeed}
            onOption={setOptionId}
            sponsoredLeft={sponsoredLeft}
          />
        )}
        <Findings findings={simulation.findings} />
        <SignConfirm
          mode={mode}
          prompt="Approve transaction?"
          onApprove={approve}
          onReject={() => {
            resolve(false);
          }}
        />
      </div>
    </Sheet>
  );
}
