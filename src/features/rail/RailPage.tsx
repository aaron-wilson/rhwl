import { Building2, ChevronLeft, KeyRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import { amount, parseAmount, type Amount } from "../../domain/money/amount";
import { formatToken } from "../../domain/money/format";
import { maxSendable } from "../../domain/send/amount";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useActiveAccountEntry } from "../accounts";
import { Private } from "../privacy";
import { useHoldings } from "../transactions";
import { NETWORK_FEE, NETWORK_FEE_COST } from "../transactions/actions";
import { RailDirection, type TransferDirection } from "./RailDirection";
import { RailReview } from "./RailReview";
import {
  deposit,
  linkAccount,
  unlinkAccount,
  useRail,
  withdraw,
  type RailAsset,
} from "./rail-store";

const LINK_MS = 800;
const feeCost = NETWORK_FEE_COST;

/** The rail between a (simulated) Robinhood brokerage account and this wallet. */
export function RailPage() {
  const account = useActiveAccountEntry();
  const providers = useProviders();
  const rail = useRail();
  const holdings = useHoldings(account?.id ?? "");
  const [linking, setLinking] = useState(false);
  const [direction, setDirection] = useState<TransferDirection>("deposit");
  const [asset, setAsset] = useState<RailAsset>("rh:USDG");
  const [amountText, setAmountText] = useState("");
  const [moving, setMoving] = useState(false);

  if (account === undefined) return null;
  const token = assetById(asset);
  const inWallet =
    holdings.find((h) => h.assetId === asset)?.quantity ?? amount(0n, token.decimals);
  const available =
    direction === "deposit"
      ? rail.balances[asset]
      : maxSendable(inWallet, asset === NETWORK_FEE.assetId ? feeCost : undefined);
  const parsed = parseAmount(amountText.trim(), token.decimals);
  const value = parsed !== undefined && parsed.base > 0n ? parsed : undefined;
  const short = value !== undefined && value.base > available.base;
  const watchOnly = account.kind === "watch";

  function link() {
    setLinking(true);
    providers.clock.schedule(() => {
      linkAccount();
      setLinking(false);
    }, LINK_MS);
  }

  async function move() {
    if (value === undefined || account === undefined) return;
    setMoving(true);
    const ok =
      direction === "deposit"
        ? await deposit(providers, account.id, asset, value)
        : await withdraw(providers, account.id, asset, value);
    setMoving(false);
    if (ok) setAmountText("");
  }

  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Home
      </Link>
      <PageHeader title="Transfer" subtitle="Between your Robinhood account and this wallet" />
      <div className="grid grid-cols-2 gap-3" aria-label="Custody" role="group">
        <Side
          icon={<Building2 {...icon()} />}
          title="Robinhood account"
          shortTitle="Robinhood"
          badge="Custodial"
          note="Robinhood holds these for you"
          balances={rail.linked ? rail.balances : undefined}
        />
        <Side
          icon={<KeyRound {...icon()} />}
          title={account.name}
          badge="Self-custody"
          note="Only your passkey can move these"
          balances={{
            "rh:USDG": holdings.find((h) => h.assetId === "rh:USDG")?.quantity ?? amount(0n, 6),
            "rh:ETH": holdings.find((h) => h.assetId === "rh:ETH")?.quantity ?? amount(0n, 18),
          }}
        />
      </div>
      {!rail.linked ? (
        <Card className="flex flex-col gap-3">
          <p className="text-body text-ink-2">
            Link your Robinhood account to move cash in as USDG, and crypto in or out, in seconds.
            The demo links a simulated account; no sign-in happens.
          </p>
          <Button size="lg" block loading={linking} onClick={link}>
            Link Robinhood account
          </Button>
        </Card>
      ) : watchOnly ? (
        <Card className="text-body text-ink-2">
          {account.name} is watch-only. Switch to an account you control to transfer.
        </Card>
      ) : (
        <>
          <RailDirection
            direction={direction}
            onDirectionChange={(next) => {
              setDirection(next);
              setAmountText("");
            }}
            asset={asset}
            onAssetChange={(id) => {
              setAsset(id);
              setAmountText("");
            }}
            symbol={token.symbol}
            available={available}
            amountText={amountText}
            onAmountTextChange={setAmountText}
            short={short}
          />
          <RailReview
            direction={direction}
            disabled={value === undefined || short || moving}
            moving={moving}
            onMove={() => void move()}
            onUnlink={unlinkAccount}
          />
        </>
      )}
    </div>
  );
}

function Side({
  icon: glyph,
  title,
  badge,
  note,
  balances,
  shortTitle,
}: {
  readonly shortTitle?: string;
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly badge: string;
  readonly note: string;
  readonly balances: Readonly<Record<RailAsset, Amount>> | undefined;
}) {
  return (
    <Card className="flex flex-col gap-2" aria-label={title} role="region">
      <span className="flex items-center gap-2 text-ink-2">
        {glyph}
        <span className="truncate text-footnote font-semibold">{shortTitle ?? title}</span>
      </span>
      <span className="self-start rounded-full bg-surface-2 px-2 text-caption font-semibold text-ink-2">
        {badge}
      </span>
      {balances === undefined ? (
        <span className="text-footnote text-ink-3">Not linked</span>
      ) : (
        <span className="flex flex-col text-footnote font-semibold tabular-nums">
          <span>
            <Private>{formatToken(balances["rh:USDG"], "USDG")}</Private>
          </span>
          <span>
            <Private>{formatToken(balances["rh:ETH"], "ETH")}</Private>
          </span>
        </span>
      )}
      <span className="text-caption text-ink-3">{note}</span>
    </Card>
  );
}
