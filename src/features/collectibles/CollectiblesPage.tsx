import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { cx } from "../../ui/cx";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useActiveAccount } from "../accounts";
import { burnCollectible } from "./burn";
import { CollectibleArt } from "./CollectibleArt";
import { setVerdict, useCollectibles, type CollectibleView } from "./collectibles-store";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function CollectiblesPage() {
  const { shown, hidden } = useCollectibles(useActiveAccount());
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto flex max-w-content flex-col gap-4 px-4 pb-8 sm:px-8">
      <PageHeader title="Collectibles" subtitle={plural(shown.length, "item", "items")} />
      {shown.length === 0 ? (
        <Card className="text-body text-ink-2">No collectibles in this account.</Card>
      ) : (
        <ul aria-label="Collectibles" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((v) => (
            <li key={v.item.id}>
              <Tile view={v} />
            </li>
          ))}
        </ul>
      )}
      {hidden.length > 0 && (
        <section aria-label="Hidden as spam" className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
            }}
            className="flex items-center gap-2 self-start rounded-md px-1 text-footnote font-semibold text-ink-3"
          >
            Hidden as spam ({hidden.length})
            <ChevronDown
              {...icon()}
              className={cx("transition-transform duration-fast", open && "rotate-180")}
            />
          </button>
          {open && (
            <Card padding="list" className="flex flex-col">
              <p className="px-3 pt-2 text-footnote text-ink-2">
                Spam stays out of your grid. Don&apos;t visit links it mentions. Burning removes it
                for good.
              </p>
              <ul aria-label="Spam">
                {hidden.map((v) => (
                  <li key={v.item.id}>
                    <SpamRow view={v} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

function Tile({ view }: { readonly view: CollectibleView }) {
  return (
    <Link
      to={`/collectibles/${view.item.id}`}
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-2 shadow-sm transition-[transform,box-shadow] duration-base ease-standard hover:-translate-y-px hover:shadow-md"
    >
      <CollectibleArt item={view.item} collection={view.collection} />
      <span className="flex min-w-0 flex-col px-1 pb-1">
        <span className="truncate text-body font-semibold">{view.item.name}</span>
        <span className="flex items-center gap-2 truncate text-footnote text-ink-3">
          {view.collection.name}
          {view.leaving && <Badge tone="live">Pending</Badge>}
        </span>
      </span>
    </Link>
  );
}

function SpamRow({ view }: { readonly view: CollectibleView }) {
  const providers = useProviders();
  return (
    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CollectibleArt
          item={view.item}
          collection={view.collection}
          className="size-12 shrink-0"
        />
        <div className="flex min-w-0 flex-col">
          <Link
            to={`/collectibles/${view.item.id}`}
            className="truncate text-headline font-semibold"
          >
            {view.item.name}
          </Link>
          <span className="text-footnote text-ink-3">
            {view.verdict === "spam"
              ? "You reported this as spam"
              : view.reasons.map((r) => r.message).join(" · ")}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setVerdict(view.item.id, "not-spam");
          }}
        >
          Not spam
        </Button>
        <Button
          size="sm"
          variant="destructive"
          loading={view.leaving}
          onClick={() => void burnCollectible(providers, view.item.id)}
        >
          Burn
        </Button>
      </div>
    </div>
  );
}
