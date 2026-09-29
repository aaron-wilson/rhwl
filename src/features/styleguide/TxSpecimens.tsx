import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useSession } from "../../app/session-context";
import { useActiveAccount } from "../accounts";
import { assetById } from "../../data/assets";
import { parseAmount, type Amount } from "../../domain/money/amount";
import { formatToken } from "../../domain/money/format";
import type { TxRequest } from "../../ports/chain";
import { Button } from "../../ui/Button";
import { useHoldings } from "../transactions";
import { runTransaction } from "../transactions/actions";
import { Section } from "./Section";

const q = (assetId: string, text: string): Amount =>
  parseAmount(text, assetById(assetId).decimals) ?? {
    base: 0n,
    decimals: assetById(assetId).decimals,
  };

const sendToSelf: TxRequest = {
  kind: "send",
  summary: {
    verb: "Send",
    primary: { assetId: "rh:USDG", quantity: q("rh:USDG", "-20") },
    detail: "to Degen",
  },
  deltas: [{ assetId: "rh:USDG", quantity: q("rh:USDG", "-20") }],
  fee: { assetId: "rh:ETH", quantity: q("rh:ETH", "-0.000004") },
  to: "0x44b1d09c7e3fa2b6581c0d4e9f7a3b2c16d59e0d",
};

/**
 * Drives the real transaction service against the demo chain: happy path,
 * forced failure, clock steps and a demo reset. Presenter mode takes these over.
 */
export function TxSpecimens() {
  const providers = useProviders();
  const { resetDemo } = useSession();
  const account = useActiveAccount();
  const usdg = useHoldings(account).find((h) => h.assetId === "rh:USDG");
  return (
    <Section title="Transactions">
      <p className="text-body text-ink-2">
        USDG balance{" "}
        <span className="font-semibold text-ink tabular-nums" data-testid="usdg-balance">
          {usdg === undefined ? "0 USDG" : formatToken(usdg.quantity, "USDG")}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => void runTransaction(providers, account, sendToSelf)}
        >
          Send 20 USDG
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            providers.demo?.failNextTransaction("Simulated network error");
            void runTransaction(providers, account, sendToSelf);
          }}
        >
          Send and fail
        </Button>
        <Button variant="secondary" onClick={() => providers.demo?.advanceClock(5000)}>
          Advance 5 s
        </Button>
        <Button variant="secondary" onClick={() => providers.demo?.advanceClock(5 * 60_000)}>
          Advance 5 min
        </Button>
        <Button variant="secondary" onClick={resetDemo}>
          Reset demo
        </Button>
        <Link to="/activity" className="self-center font-semibold text-accent">
          View in Activity
        </Link>
      </div>
    </Section>
  );
}
