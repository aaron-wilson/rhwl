import type { TxSummary } from "../../ports/chain";
import { useBalancesHidden } from "../privacy";
import { txTitleText } from "./tx-title";

/** A transaction's title that respects the hide-balances setting everywhere it appears. */
export function TxTitle({
  summary,
  withAmount = true,
}: {
  readonly summary: TxSummary;
  readonly withAmount?: boolean;
}) {
  const hidden = useBalancesHidden();
  return <>{txTitleText(summary, { hidden, withAmount })}</>;
}
