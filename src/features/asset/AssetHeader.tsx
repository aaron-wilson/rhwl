import { MessagesSquare } from "lucide-react";
import { Link } from "react-router";
import type { Asset } from "../../data/types";
import { Badge } from "../../ui/Badge";
import { icon } from "../../ui/icon";
import { TokenIcon } from "../../ui/TokenIcon";
import { roomPath } from "./asset-path";

const kindLabel = {
  crypto: "Crypto",
  stable: "Stablecoin",
  stock: "Stock Token",
  meme: "Meme",
} as const;

export function AssetHeader({ asset }: { readonly asset: Asset }) {
  return (
    <header className="flex items-center gap-3">
      <TokenIcon
        symbol={asset.symbol}
        splash={asset.splash}
        size="lg"
        {...(asset.kind === "stock" ? { badge: "S" } : {})}
      />
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-title1 font-bold">{asset.name}</h1>
        <p className="flex items-center gap-2 text-footnote text-ink-3">
          {asset.symbol}
          <Badge>{kindLabel[asset.kind]}</Badge>
        </p>
      </div>
      {asset.kind === "stock" && (
        <Link
          to={roomPath(asset)}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-footnote font-semibold text-ink-2 hover:text-ink"
        >
          <MessagesSquare {...icon()} />
          Holders&apos; room
        </Link>
      )}
    </header>
  );
}
