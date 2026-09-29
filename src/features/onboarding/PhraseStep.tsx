import { useEffect, useState } from "react";
import { generateMnemonic } from "../../domain/keys/mnemonic";
import { loadWordlist } from "../../domain/keys/wordlist";
import { createRandom } from "../../lib/prng";
import { Button } from "../../ui/Button";
import { cx } from "../../ui/cx";

/**
 * Shows the new recovery phrase only while the user presses and holds (or holds
 * Space/Enter). The words stay out of the DOM the rest of the time.
 */
export function PhraseStep({ onSaved }: { readonly onSaved: (words: readonly string[]) => void }) {
  const [phrase, setPhrase] = useState<readonly string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    let live = true;
    void loadWordlist()
      .then((words) => generateMnemonic(words, createRandom("demo-recovery-phrase")))
      .then((words) => {
        if (live) setPhrase(words);
      });
    return () => {
      live = false;
    };
  }, []);

  const show = () => {
    setRevealed(true);
    setSeen(true);
  };
  const hide = () => {
    setRevealed(false);
  };

  return (
    <section className="flex flex-col gap-6 pt-16">
      <h1 className="text-title1 font-bold">Your recovery phrase</h1>
      <p className="text-body text-ink-2">
        These 12 words are the wallet. Anyone who has them owns everything in it. Write them down in
        order and keep them offline. Never screenshot or paste them anywhere.
      </p>
      <p className="rounded-md bg-warn-soft p-3 text-footnote text-warn">
        Simulated: this phrase comes from the demo seed and is not secret. Never use it for real
        funds.
      </p>
      <button
        type="button"
        aria-label={
          revealed ? "Recovery phrase, shown" : "Press and hold to reveal the recovery phrase"
        }
        onPointerDown={show}
        onPointerUp={hide}
        onPointerLeave={hide}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            show();
          }
        }}
        onKeyUp={hide}
        onBlur={hide}
        className="grid touch-none grid-cols-3 gap-2 rounded-lg bg-surface-2 p-4 text-left select-none"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="flex gap-1 text-body">
            <span className="w-5 text-ink-3 tabular-nums">{i + 1}</span>
            <span
              className={cx("font-semibold", !revealed && "blur-chrome")}
              data-testid="phrase-word"
            >
              {revealed ? (phrase[i] ?? "") : "•••••"}
            </span>
          </span>
        ))}
      </button>
      <p className="text-center text-footnote text-ink-3">Press and hold to reveal</p>
      <Button
        size="lg"
        block
        disabled={!seen || phrase.length !== 12}
        onClick={() => {
          onSaved(phrase);
        }}
      >
        I've written it down
      </Button>
    </section>
  );
}
