import { ChevronLeft, Lock } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useNow } from "../../app/useNow";
import { NotFoundPage } from "../../app/NotFoundPage";
import type { StockToken } from "../../data/types";
import { OPENING_AT } from "../../data/world";
import { badgeFor, holdingSince, roomMessages } from "../../domain/rooms/rooms";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useActiveAccount } from "../accounts";
import { assetBySlug, assetPath } from "../asset";
import { historyOf, usePosition } from "../asset";
import { signMessageAs } from "../transactions/actions";
import { RoomChat, SentimentGauge } from "./RoomChat";
import { markJoined, useJoined } from "./rooms-store";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A holder-only room per Stock Token: prove you hold it by signing, then read the room. */
export function RoomPage() {
  const { slug = "" } = useParams();
  const asset = assetBySlug(slug);
  if (asset === undefined || asset.kind !== "stock") return <NotFoundPage />;
  return <Room key={asset.id} asset={asset} />;
}

function Room({ asset }: { readonly asset: StockToken }) {
  const account = useActiveAccount();
  const now = useNow(5_000);
  const joined = useJoined(account, asset.symbol);
  const [signing, setSigning] = useState(false);
  const position = usePosition(account, asset, now);
  const history = historyOf(position.activity, asset.id);
  const since = holdingSince(position.quantity, history, OPENING_AT);
  const badge = since === undefined ? undefined : badgeFor(now.getTime() - since.getTime());

  async function join() {
    setSigning(true);
    const signed = await signMessageAs(account, {
      payload: JSON.stringify({ room: asset.symbol, holds: asset.id, at: now.toISOString() }),
      display: `I hold ${asset.symbol} and want to join its holders' room.\n\nThis signature proves the wallet holds it. It moves nothing.`,
    });
    setSigning(false);
    if (signed !== undefined) markJoined(account, asset.symbol);
  }

  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to={assetPath(asset)}
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        {asset.symbol}
      </Link>
      <PageHeader title={`${asset.symbol} holders`} subtitle="A room for people who hold it" />
      {since === undefined ? (
        <Card className="flex items-center gap-3 text-body text-ink-2" role="note">
          <Lock {...icon()} className="shrink-0 text-ink-3" />
          Only {asset.symbol} holders can join. Buy some to get in.
        </Card>
      ) : !joined ? (
        <Card className="flex flex-col gap-3">
          <p className="text-body text-ink-2">
            Sign a message to prove this wallet holds {asset.symbol}. Nothing is sent or spent.
          </p>
          <Button size="lg" block loading={signing} onClick={() => void join()}>
            Prove and join
          </Button>
        </Card>
      ) : (
        <>
          <p
            className="flex items-center gap-2 px-1 text-footnote text-ink-2"
            data-testid="room-badge"
          >
            <Badge tone="accent">{badge}</Badge>
            Holding for {Math.floor((now.getTime() - since.getTime()) / DAY_MS)} days
          </p>
          <SentimentGauge messages={roomMessages("rooms", asset.symbol, now)} />
          <RoomChat messages={roomMessages("rooms", asset.symbol, now)} now={now} />
          <p className="px-1 text-caption text-ink-3">
            Messages here are scripted for the demo, and none of them is advice.
          </p>
        </>
      )}
    </div>
  );
}
