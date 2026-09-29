import { useEffect, useRef, useState } from "react";
import type { Collectible, Collection } from "../../data/collectibles";
import { Skeleton } from "../../ui/Skeleton";
import { cx } from "../../ui/cx";

const color = (name: string) => `var(--rh-color-splash-${name})`;

/** A small stable hash, so the same item always draws the same picture. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function Shapes({ collection, seed }: { readonly collection: Collection; readonly seed: number }) {
  // Half the items swap the palette's order.
  const [first, second] = collection.palette.map(color);
  const [a, b] = seed % 2 === 0 ? [first, second] : [second, first];
  const pick = (n: number, shift: number) => (seed >>> shift) % n;
  switch (collection.id) {
    case "chainlets":
      // Stacked blocks, count and offsets from the seed.
      return (
        <>
          {Array.from({ length: 2 + pick(3, 0) }, (_, i) => (
            <rect
              key={i}
              x={22 + pick(12, 4 + i) - 6}
              y={66 - i * 18}
              width={56}
              height={16}
              rx={4}
              fill={i % 2 === 0 ? a : b}
              opacity={0.9}
            />
          ))}
        </>
      );
    case "stonk-seals":
      return (
        <>
          <circle cx={50} cy={50} r={30} fill="none" stroke={a} strokeWidth={4 + pick(5, 23)} />
          <circle cx={50} cy={50} r={18 + pick(6, 3)} fill={b} opacity={0.85} />
          <path
            d={`M34 ${56 - pick(10, 7)} L${44 + pick(6, 11)} ${44 + pick(10, 13)} L56 ${48 + pick(8, 17)} L66 ${34 + pick(10, 19)}`}
            fill="none"
            stroke={a}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "degen-diplomas":
      return (
        <>
          <rect x={18} y={30} width={64} height={40} rx={6} fill={a} opacity={0.85} />
          <rect x={26} y={40} width={36 + pick(12, 2)} height={4} rx={2} fill={b} />
          <rect x={26} y={50} width={28 + pick(16, 5)} height={4} rx={2} fill={b} />
          <circle cx={70} cy={66} r={9} fill={b} />
        </>
      );
    default:
      // Unverified collections get a plain ticket shape.
      return (
        <>
          <rect x={16} y={34} width={68} height={32} rx={4} fill={a} opacity={0.8} />
          <circle cx={16} cy={50} r={6} fill={b} />
          <circle cx={84} cy={50} r={6} fill={b} />
        </>
      );
  }
}

/**
 * Generated artwork: gradients and shapes from the collection's palette and the
 * item's id, never borrowed art. Drawn only once it scrolls near the viewport,
 * with a shimmering placeholder until then.
 */
export function CollectibleArt({
  item,
  collection,
  className,
}: {
  readonly item: Collectible;
  readonly collection: Collection;
  readonly className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver (old engines, tests) draw at once.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const node = box.current;
    if (node === null || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [visible]);

  const seed = hash(item.id);
  const gradient = `art-${item.id}`;
  const [a, b] = collection.palette.map(color);
  const angle = seed % 360;
  return (
    <div ref={box} className={cx("relative aspect-square overflow-hidden rounded-md", className)}>
      {visible ? (
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={`Artwork for ${item.name}`}
          className="block size-full animate-page-in"
        >
          <defs>
            <linearGradient id={gradient} gradientTransform={`rotate(${angle} 0.5 0.5)`}>
              <stop offset="0" stopColor={a} stopOpacity={0.35} />
              <stop offset="1" stopColor={b} stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <rect width={100} height={100} fill={`url(#${gradient})`} />
          <Shapes collection={collection} seed={seed} />
        </svg>
      ) : (
        <Skeleton className="size-full" />
      )}
    </div>
  );
}
