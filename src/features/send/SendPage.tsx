import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import { shortAddress } from "../../domain/keys/address";
import { amount, toPlainDecimal, valueInCents } from "../../domain/money/amount";
import { formatFiat, formatToken } from "../../domain/money/format";
import {
  maxSendable,
  parseSendAmount,
  sendProblem,
  type AmountUnit,
} from "../../domain/send/amount";
import type { TxRequest } from "../../ports/chain";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { useActiveAccountEntry } from "../accounts";
import { useHoldings } from "../transactions";
import { NETWORK_FEE } from "../transactions/actions";
import { runTransaction } from "../transactions/actions";
import { AmountStep } from "./AmountStep";
import { RecipientStep } from "./RecipientStep";
import { feeCost, GAS } from "./send-form";
import { SendLayout } from "./SendLayout";
import { useRecipient } from "./useRecipient";

/** Recipient, asset and amount on one screen; review happens on the sign sheet's dry run. */
export function SendPage() {
  const account = useActiveAccountEntry();
  const providers = useProviders();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const holdings = useHoldings(account?.id ?? "");
  const now = useNow();
  const field = useRecipient(account, params.get("to") ?? "");

  const sendable = holdings.filter((h) => assetById(h.assetId).chain === "robinhood");
  const requested = params.get("asset") ?? "";
  const [assetId, setAssetId] = useState(
    sendable.some((h) => h.assetId === requested) ? requested : (sendable[0]?.assetId ?? GAS),
  );
  const [amountText, setAmountText] = useState(params.get("amount") ?? "");
  const [unit, setUnit] = useState<AmountUnit>("token");
  const [sending, setSending] = useState(false);
  const otherChain = params.has("chain") && params.get("chain") !== "robinhood";

  if (account === undefined) return null;
  if (account.kind === "watch") {
    return (
      <SendLayout>
        <Card className="text-body text-ink-2">
          {account.name} is watch-only. Switch to an account you control to send.
        </Card>
      </SendLayout>
    );
  }

  const asset = assetById(assetId);
  const balance =
    sendable.find((h) => h.assetId === assetId)?.quantity ?? amount(0n, asset.decimals);
  const gasBalance = holdings.find((h) => h.assetId === GAS)?.quantity ?? amount(0n, 18);
  const price = providers.market.price(assetId, now);
  const { recipient } = field;
  const value = parseSendAmount(amountText, unit, asset.decimals, price);
  const problem =
    value === undefined
      ? undefined
      : sendProblem({
          amount: value,
          balance,
          fee: feeCost,
          gasBalance,
          sendingGasToken: assetId === GAS,
        });
  const ready = field.ready && value !== undefined && problem === undefined && !sending;

  async function send() {
    if (recipient.status !== "ok" || value === undefined || account === undefined) return;
    const label = recipient.name ?? shortAddress(recipient.address);
    const request: TxRequest = {
      kind: "send",
      summary: {
        verb: "Send",
        primary: { assetId, quantity: amount(-value.base, value.decimals) },
        detail: `to ${label}`,
      },
      deltas: [{ assetId, quantity: amount(-value.base, value.decimals) }],
      fee: NETWORK_FEE,
      to: recipient.address,
    };
    setSending(true);
    const tx = await runTransaction(providers, account.id, request);
    setSending(false);
    if (tx.machine.state === "confirmed") void navigate("/activity");
  }

  const converted =
    value === undefined
      ? undefined
      : unit === "token"
        ? formatFiat(valueInCents(value, price))
        : formatToken(value, asset.symbol);

  return (
    <SendLayout subtitle={`From ${account.name}`}>
      {otherChain && (
        <p role="note" className="rounded-md bg-warn-soft p-4 text-footnote text-warn">
          This request is for another network. This wallet sends on Robinhood Chain only.
        </p>
      )}
      <RecipientStep field={field} />
      <AmountStep
        sendable={sendable}
        assetId={assetId}
        onAsset={(id) => {
          setAssetId(id);
          setAmountText("");
          setUnit("token");
        }}
        amountText={amountText}
        setAmountText={setAmountText}
        unit={unit}
        onToggleUnit={() => {
          setUnit(unit === "token" ? "usd" : "token");
          setAmountText("");
        }}
        onMax={() => {
          setUnit("token");
          setAmountText(
            toPlainDecimal(maxSendable(balance, assetId === GAS ? feeCost : undefined)),
          );
        }}
        balance={balance}
        converted={converted}
        value={value}
        problem={problem}
      />
      <Button size="lg" block disabled={!ready} loading={sending} onClick={() => void send()}>
        Review and send
      </Button>
    </SendLayout>
  );
}
