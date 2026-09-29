import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { icon } from "../../ui/icon";
import { useActiveAccount } from "../accounts";
import { CollectibleArt } from "./CollectibleArt";
import { useCollectibles } from "./collectibles-store";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Home's doorway to the collectibles grid: a few thumbnails and the counts. */
export function CollectiblesPreview() {
  const { shown, hidden } = useCollectibles(useActiveAccount());
  if (shown.length === 0 && hidden.length === 0) return null;
  return (
    <section aria-label="Collectibles" className="flex flex-col gap-2">
      <h2 className="px-1 text-footnote font-semibold text-ink-3">Collectibles</h2>
      <Link
        to="/collectibles"
        className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-sm transition-[transform,box-shadow] duration-base ease-standard hover:-translate-y-px hover:shadow-md"
      >
        <span className="flex -space-x-3">
          {shown.slice(0, 4).map((v) => (
            <CollectibleArt
              key={v.item.id}
              item={v.item}
              collection={v.collection}
              className="size-12 border-2 border-surface"
            />
          ))}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-headline font-semibold">
            {plural(shown.length, "item", "items")}
          </span>
          {hidden.length > 0 && (
            <span className="text-footnote text-ink-3">{hidden.length} hidden as spam</span>
          )}
        </span>
        <ChevronRight {...icon()} className="text-ink-3" />
      </Link>
    </section>
  );
}
