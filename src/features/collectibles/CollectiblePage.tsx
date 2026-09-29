import { ChevronLeft, Flame, Send, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useProviders } from "../../app/providers-context";
import { chains } from "../../data/chains";
import { shortAddress } from "../../domain/keys/address";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { burnCollectible } from "./burn";
import { CollectibleArt } from "./CollectibleArt";
import { setVerdict, useCollectible } from "./collectibles-store";
import { SendCollectibleSheet } from "./SendCollectibleSheet";

const percent = (bps: number) =>
  `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

function BackLink() {
  return (
    <Link
      to="/collectibles"
      className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
    >
      <ChevronLeft {...icon()} />
      Collectibles
    </Link>
  );
}

export function CollectiblePage() {
  const { id = "" } = useParams();
  const view = useCollectible(id);
  const providers = useProviders();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);

  if (view === undefined) {
    return (
      <div className="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 sm:px-8">
        <BackLink />
        <PageHeader title="Not in your wallet" subtitle="It may have been burned or sent." />
      </div>
    );
  }

  const { item, collection, reasons, spam, verdict, leaving } = view;
  const network = chains.find((c) => c.id === "robinhood")?.name ?? "Robinhood Chain";
  const details = [
    { label: "Token ID", value: item.tokenId },
    { label: "Standard", value: "ERC-721" },
    { label: "Network", value: network },
    { label: "Contract", value: shortAddress(collection.contract) },
    ...(collection.floorEth === undefined
      ? []
      : [{ label: "Collection floor", value: `${collection.floorEth} ETH` }]),
    { label: "Collection size", value: collection.supply.toLocaleString("en-US") },
  ];

  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 pb-8 sm:px-8">
      <BackLink />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        <CollectibleArt item={item} collection={collection} className="shadow-md" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-footnote font-semibold text-ink-3">
              {collection.name}
              {collection.verified ? (
                <Badge tone="accent" icon={<ShieldCheck {...icon()} />}>
                  Verified
                </Badge>
              ) : (
                <Badge tone="warn" icon={<ShieldAlert {...icon()} />}>
                  Unverified
                </Badge>
              )}
            </p>
            <h1 className="text-title1 font-bold">{item.name}</h1>
            <p className="text-body text-ink-2">{item.description}</p>
          </div>
          {spam && (
            <Card className="flex flex-col gap-2" data-testid="spam-warning">
              <p className="text-headline font-semibold text-warn">Hidden as likely spam</p>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-footnote text-ink-2">
                {verdict === "spam" && <li>You reported it</li>}
                {reasons.map((r) => (
                  <li key={r.signal}>{r.message}</li>
                ))}
              </ul>
            </Card>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              loading={leaving}
              icon={<Send {...icon()} />}
              onClick={() => {
                setSending(true);
              }}
            >
              Send
            </Button>
            <Button
              variant="destructive"
              loading={leaving}
              icon={<Flame {...icon()} />}
              onClick={() => {
                void burnCollectible(providers, item.id).then((burned) => {
                  if (burned) void navigate("/collectibles", { replace: true });
                });
              }}
            >
              Burn
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setVerdict(item.id, spam ? "not-spam" : "spam");
              }}
            >
              {spam ? "Not spam" : "Report spam"}
            </Button>
          </div>
          <p className="px-1 text-caption text-ink-3">
            Sending checks the address like any send. Burning is permanent.
          </p>
        </div>
      </div>
      {item.traits.length > 0 && (
        <section aria-labelledby="traits" className="flex flex-col gap-2">
          <h2 id="traits" className="px-1 text-footnote font-semibold text-ink-3">
            Traits
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {item.traits.map((t) => (
              <li key={t.type} className="flex flex-col rounded-md bg-surface-2 px-3 py-2">
                <span className="text-caption text-ink-3">{t.type}</span>
                <span className="text-body font-semibold">{t.value}</span>
                <span className="text-caption text-ink-2">{percent(t.rarityBps)} have this</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="details" className="flex flex-col gap-2">
        <h2 id="details" className="px-1 text-footnote font-semibold text-ink-3">
          Details
        </h2>
        <Card>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {details.map((d) => (
              <div key={d.label} className="flex flex-col gap-1">
                <dt className="text-footnote text-ink-3">{d.label}</dt>
                <dd className="text-body font-semibold tabular-nums">{d.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>
      <SendCollectibleSheet
        item={item}
        open={sending}
        onClose={() => {
          setSending(false);
        }}
        onSent={() => {
          void navigate("/collectibles", { replace: true });
        }}
      />
    </div>
  );
}
