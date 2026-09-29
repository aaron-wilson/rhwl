import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { assets } from "../../data/assets";
import { chains } from "../../data/chains";
import type { Chain } from "../../data/types";
import { toChecksumAddress } from "../../domain/keys/checksum";
import { requestAmount, requestLink } from "../../domain/receive/links";
import { cx } from "../../ui/cx";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useActiveAccountEntry } from "../accounts";
import { ReceiveQr } from "./ReceiveQr";
import { ReceiveRequest } from "./ReceiveRequest";
import { ReceiveWarnings } from "./ReceiveWarnings";

const shortName: Record<Chain["id"], string> = {
  robinhood: "Robinhood Chain",
  ethereum: "Ethereum",
  arbitrum: "Arbitrum",
  base: "Base",
  solana: "Solana",
};

/** The address on each network as a QR code, with copy, share and a request-amount link. */
export function ReceivePage() {
  const account = useActiveAccountEntry();
  const [chainId, setChainId] = useState<Chain["id"]>("robinhood");
  const [assetId, setAssetId] = useState("rh:USDG");
  const [amountText, setAmountText] = useState("");

  if (account === undefined) return null;
  const available = chains.filter(
    (c) => c.evmId !== undefined || account.solanaAddress !== undefined,
  );
  const chain = available.find((c) => c.id === chainId) ?? chains[0];
  if (chain === undefined) return null;
  const address =
    chain.id === "solana" ? (account.solanaAddress ?? "") : toChecksumAddress(account.address);
  const requestable = assets.filter((a) => a.chain === chain.id);
  const asset = requestable.find((a) => a.id === assetId) ?? requestable[0];
  const amount = asset === undefined ? undefined : requestAmount(amountText, asset.decimals);
  const link =
    asset === undefined || amount === undefined
      ? undefined
      : requestLink(window.location.origin, {
          to: address,
          chain: chain.id,
          assetId: asset.id,
          amount,
        });

  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 pb-8 sm:px-8">
      <Link
        to="/"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Home
      </Link>
      <PageHeader title="Receive" subtitle={`To ${account.name}`} />
      <div role="group" aria-label="Network" className="flex flex-wrap gap-2">
        {available.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === chain.id}
            onClick={() => {
              setChainId(c.id);
              setAmountText("");
            }}
            className={cx(
              "h-10 rounded-full px-4 text-footnote font-semibold transition-colors duration-fast",
              c.id === chain.id ? "bg-ink text-canvas" : "bg-surface-2 text-ink-2 hover:text-ink",
            )}
          >
            {shortName[c.id]}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        <ReceiveQr accountName={account.name} chain={chain} address={address} />
        <div className="flex flex-col gap-6">
          <ReceiveWarnings chain={chain} />
          {asset !== undefined && (
            <ReceiveRequest
              accountName={account.name}
              asset={asset}
              requestable={requestable}
              amountText={amountText}
              onAmountTextChange={setAmountText}
              onAssetChange={setAssetId}
              amount={amount}
              link={link}
            />
          )}
        </div>
      </div>
    </div>
  );
}
