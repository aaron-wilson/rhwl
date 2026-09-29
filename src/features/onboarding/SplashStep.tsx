import { useEffect, useRef } from "react";
import { HONESTY_LINE } from "../../data/honesty";
import { Button } from "../../ui/Button";
import { Mark } from "../../ui/brand/Mark";
import { TokenIcon } from "../../ui/TokenIcon";

const floaters = [
  { symbol: "NVDA", left: "10%", top: "8%" },
  { symbol: "ETH", left: "74%", top: "5%" },
  { symbol: "$CHIPDOG", left: "58%", top: "20%" },
  { symbol: "SPY", left: "26%", top: "22%" },
  { symbol: "USDG", left: "84%", top: "30%" },
  { symbol: "TSLA", left: "4%", top: "30%" },
] as const;

/**
 * The app's one parallax: floating tokens drift slower than the headline as the
 * page scrolls. CSS scroll-driven animation where supported, a throttled
 * scroll listener elsewhere. Reduced motion keeps everything still.
 */
function useParallaxFallback() {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = layer.current;
    const supported = typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (node === null || supported || still) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        node.style.transform = `translateY(${window.scrollY * 0.45}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return layer;
}

export function SplashStep({ onStart }: { readonly onStart: () => void }) {
  const layer = useParallaxFallback();
  return (
    <div className="relative flex min-h-[150dvh] flex-col">
      <div
        ref={layer}
        aria-hidden="true"
        className="parallax-layer pointer-events-none absolute inset-x-0 top-0 h-dvh"
      >
        {floaters.map((f) => (
          <span key={f.symbol} className="absolute opacity-80" style={{ left: f.left, top: f.top }}>
            <TokenIcon symbol={f.symbol} size="lg" />
          </span>
        ))}
      </div>
      <section className="relative flex min-h-dvh flex-col justify-end gap-6 pb-12">
        <Mark size={56} />
        <h1 className="text-large font-bold">Stocks, crypto and memes. One wallet.</h1>
        <p className="text-headline text-ink-2">
          The only wallet where a stock, a memecoin paired to it, and a perp on both live in one
          portfolio.
        </p>
        <Button size="lg" block onClick={onStart}>
          Create a wallet
        </Button>
        <p className="text-center text-caption text-ink-3">{HONESTY_LINE}</p>
      </section>
      <section className="relative flex flex-col gap-4 pb-24 text-body text-ink-2">
        <h2 className="text-title3 font-semibold text-ink">Why this wallet</h2>
        <p>Stock Tokens trade 24/7, with the exchange's hours and the last close always in view.</p>
        <p>Every transaction is simulated before you sign, in plain English.</p>
        <p>Your keys, your passkey, your coins. No seed phrase to lose unless you want one.</p>
      </section>
    </div>
  );
}
