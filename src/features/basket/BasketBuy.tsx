import { useId, useState } from "react";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import { allocate, weightProblems, type Weight } from "../../domain/basket/basket";
import { amount, centsToUsdg, parseAmount, valueInCents } from "../../domain/money/amount";
import { formatFiat, formatToken } from "../../domain/money/format";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { useActiveAccount } from "../accounts";
import { Private } from "../privacy";
import { useHoldings } from "../transactions";
import { BasketWhatIf } from "../whatif";
import { runTransaction } from "../transactions/actions";
import { basketBuyRequest, USDG } from "./basket-request";
import { markBought } from "./basket-store";

/** A dollar amount, the legs it would buy, and one signature for all of them. */
export function BasketBuy({
  name,
  weights,
}: {
  readonly name: string;
  readonly weights: readonly Weight[];
}) {
  const providers = useProviders();
  const account = useActiveAccount();
  const cash = useHoldings(account).find((h) => h.assetId === USDG)?.quantity ?? amount(0n, 6);
  const now = useNow();
  const id = useId();
  const [text, setText] = useState("500");
  const [sending, setSending] = useState(false);
  const cents = parseAmount(text.trim().replace(/^\$/, ""), 2)?.base;
  const problems = weightProblems(weights);
  const request =
    cents === undefined || cents <= 0n || problems.length > 0
      ? undefined
      : basketBuyRequest(name, weights, cents, providers.market, now);
  const short = cents !== undefined && centsToUsdg(cents).base > cash.base;

  async function buy() {
    if (request === undefined) return;
    setSending(true);
    const tx = await runTransaction(providers, account, request);
    setSending(false);
    if (tx.machine.state === "confirmed") markBought();
  }

  return (
    <section aria-labelledby="basket-buy" className="flex flex-col gap-2">
      <h2 id="basket-buy" className="px-1 text-footnote font-semibold text-ink-3">
        Buy the basket
      </h2>
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-body">
            Spend in USDG
          </label>
          <input
            id={id}
            inputMode="decimal"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            className="h-10 w-24 rounded-md bg-surface-2 px-3 text-right tabular-nums"
          />
        </div>
        {problems.length > 0 && (
          <ul className="flex flex-col gap-1 text-footnote text-loss" role="alert">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {request?.legs !== undefined && (
          <ul aria-label="Allocation" className="flex flex-col gap-1 text-footnote">
            {request.legs.map((leg) => {
              const bought = leg.summary.primary;
              if (bought === undefined) return null;
              const asset = assetById(bought.assetId);
              return (
                <li key={bought.assetId} className="flex justify-between gap-3">
                  <span>{asset.symbol}</span>
                  <span className="text-ink-2 tabular-nums">
                    <Private>{formatToken(bought.quantity, asset.symbol)}</Private> ·{" "}
                    <Private>
                      {formatFiat(
                        valueInCents(bought.quantity, providers.market.price(asset.id, now)),
                      )}
                    </Private>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {request?.legs !== undefined && cents !== undefined && (
          <BasketWhatIf weights={weights} legCents={allocate(cents, weights)} />
        )}
        {short && <p className="text-footnote text-loss">Not enough USDG</p>}
        <Button
          size="lg"
          block
          disabled={request === undefined || short || sending}
          loading={sending}
          onClick={() => void buy()}
        >
          Review {request?.legs?.length ?? 0} buys
        </Button>
      </Card>
    </section>
  );
}
