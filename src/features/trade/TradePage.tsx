import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { assets } from "../../data/assets";
import type { Asset } from "../../data/types";
import { changeBps } from "../../domain/market/change";
import { formatPercentBps, formatPrice } from "../../domain/money/format";
import { Card } from "../../ui/Card";
import { NavCard } from "../../ui/NavCard";
import { ListRow } from "../../ui/ListRow";
import { PageHeader } from "../../ui/PageHeader";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { TokenIcon } from "../../ui/TokenIcon";
import { assetPath } from "../asset";
import { MarketStatus } from "./MarketStatus";

type Market = "stocks" | "crypto";

const lists: Record<Market, readonly Asset[]> = {
  stocks: assets.filter((a) => a.kind === "stock"),
  crypto: assets.filter((a) => a.kind === "crypto" && a.chain === "robinhood"),
};

/** Every Stock Token and Robinhood Chain crypto asset, live, around the clock. */
export function TradePage() {
  const [market, setMarket] = useState<Market>("stocks");
  const { market: prices } = useProviders();
  const now = useNow();
  const rows = useMemo(
    () =>
      lists[market].map((asset) => {
        const price = prices.price(asset.id, now);
        return { asset, price, change: changeBps(price, prices.reference(asset.id, now).price) };
      }),
    [market, prices, now],
  );
  return (
    <div className="mx-auto flex max-w-content flex-col gap-4 px-4 sm:px-8">
      <PageHeader
        title="Trade"
        subtitle="Stock Tokens and crypto, 24/7"
        trailing={<MarketStatus />}
      />
      <SegmentedControl
        label="Market"
        options={[
          { value: "stocks", label: "Stocks" },
          { value: "crypto", label: "Crypto" },
        ]}
        value={market}
        onChange={setMarket}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <NavCard to="/perps" title="Perps" subtitle="Long or short with up to 20x, in USDG" />
        <NavCard to="/earn" title="Earn" subtitle="7% APY on USDG, paid by the second" />
        <NavCard to="/earnings" title="Earnings" subtitle="Reports that move what you hold" />
        <NavCard to="/agent" title="Agent" subtitle="Rules in plain words, within a key you sign" />
        <NavCard
          to="/tendies"
          title="Tendies Index"
          subtitle="Your own basket, bought in one signature"
        />
      </div>
      <Card padding="list" className="flex flex-col">
        <ul aria-label={market === "stocks" ? "Stock Tokens" : "Crypto"}>
          {rows.map(({ asset, price, change }) => (
            <li key={asset.id}>
              <Link
                to={assetPath(asset)}
                className="block rounded-md transition-colors duration-fast hover:bg-surface-2"
              >
                <ListRow
                  leading={
                    <TokenIcon
                      symbol={asset.symbol}
                      splash={asset.splash}
                      {...(asset.kind === "stock" ? { badge: "S" } : {})}
                    />
                  }
                  title={asset.symbol}
                  subtitle={asset.name}
                  trailing={formatPrice(price)}
                  trailingSub={
                    <span className={change >= 0n ? "text-gain" : "text-loss"}>
                      {formatPercentBps(change)}
                    </span>
                  }
                />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
