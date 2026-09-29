import { ChevronLeft, Download } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { lotsCsv } from "../../domain/portfolio/csv";
import { formatFiat } from "../../domain/money/format";
import { downloadBlob } from "../../lib/download";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { cx } from "../../ui/cx";
import { DetailRow } from "../../ui/DetailRow";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useActiveAccount } from "../accounts";
import { Private } from "../privacy";
import { useLotBooks } from "./useLotBooks";

const tone = (cents: bigint) => (cents >= 0n ? "text-gain" : "text-loss");

/** Realized and unrealized P&L by FIFO lot, per asset and in total, with a CSV export. */
export function TaxPage() {
  const { share } = useProviders();
  const now = useNow(60_000);
  const books = useLotBooks(useActiveAccount(), now);
  const [exported, setExported] = useState<string | undefined>(undefined);
  const realized = books.reduce((sum, b) => sum + b.realizedCents, 0n);
  const unrealized = books.reduce((sum, b) => sum + b.unrealizedCents, 0n);
  const fileName = `lots-${now.toISOString().slice(0, 10)}.csv`;

  async function exportCsv() {
    const blob = new Blob([lotsCsv(books)], { type: "text/csv" });
    const file = new File([blob], fileName, { type: "text/csv" });
    // Only a real share sheet can take the file; anywhere else, save it instead.
    const shared = await share
      .share({ title: "Tax lots", text: "FIFO tax lots", files: [file] })
      .then((result) => result === "shared")
      .catch(() => false);
    if (!shared) downloadBlob(blob, fileName);
    setExported(fileName);
  }

  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/settings"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Settings
      </Link>
      <PageHeader title="Tax lots" subtitle="First in, first out, per asset" />
      <Card>
        <dl className="flex flex-col gap-2 text-body" data-testid="tax-totals">
          <DetailRow label="Realized">
            <span className={tone(realized)}>
              <Private>{formatFiat(realized, "always")}</Private>
            </span>
          </DetailRow>
          <DetailRow label="Unrealized">
            <span className={tone(unrealized)}>
              <Private>{formatFiat(unrealized, "always")}</Private>
            </span>
          </DetailRow>
        </dl>
      </Card>
      <Card padding="list">
        <ul aria-label="Lots by asset" className="flex flex-col">
          {books.map((b) => (
            <li key={b.assetId} className="flex items-center justify-between gap-3 p-3">
              <span className="flex flex-col">
                <span className="text-body font-semibold">{b.symbol}</span>
                <span className="text-footnote text-ink-3">
                  {b.book.open.length} open, {b.book.closed.length} closed
                </span>
              </span>
              <span className="flex flex-col items-end text-footnote tabular-nums">
                <span className={cx(tone(b.realizedCents))}>
                  <Private>{formatFiat(b.realizedCents, "always")}</Private> realized
                </span>
                <span className={cx(tone(b.unrealizedCents))}>
                  <Private>{formatFiat(b.unrealizedCents, "always")}</Private> unrealized
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Button size="lg" block icon={<Download {...icon()} />} onClick={() => void exportCsv()}>
        Export CSV
      </Button>
      {exported !== undefined && (
        <p role="status" className="px-1 text-footnote text-ink-2">
          Exported {exported}
        </p>
      )}
      <p className="px-1 text-caption text-ink-3">
        Asset pages show average cost; tax lots use first in, first out. Simulated data, not tax
        advice.
      </p>
    </div>
  );
}
