import { useEffect, useState } from "react";
import { checkMnemonic, checkPrivateKey, isAddress } from "../../domain/keys/mnemonic";
import { loadWordlist } from "../../domain/keys/wordlist";
import { checkName } from "../../domain/onboarding/names";
import { Button } from "../../ui/Button";
import { SegmentedControl } from "../../ui/SegmentedControl";

type Mode = "phrase" | "key" | "watch";

const modes = [
  { value: "phrase", label: "Phrase" },
  { value: "key", label: "Private key" },
  { value: "watch", label: "Watch" },
] as const;

const help: Record<Mode, string> = {
  phrase: "Your 12 or 24 recovery words, separated by spaces.",
  key: "A 64-character hexadecimal private key.",
  watch:
    "An address (0x…) or a .rh name to follow without signing. Addresses are checked by shape only; mixed-case checksums are not verified.",
};

/** Import by phrase (with word suggestions), private key, or watch-only address. */
export function ImportStep({
  onImported,
  onBack,
}: {
  readonly onImported: () => void;
  readonly onBack: () => void;
}) {
  const [mode, setMode] = useState<Mode>("phrase");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [words, setWords] = useState<readonly string[]>([]);

  useEffect(() => {
    void loadWordlist().then(setWords);
  }, []);

  const current = mode === "phrase" ? (input.split(/\s+/).at(-1) ?? "").toLowerCase() : "";
  const suggestions =
    current.length >= 2 && !words.includes(current)
      ? words.filter((w) => w.startsWith(current)).slice(0, 4)
      : [];

  async function submit() {
    if (mode === "phrase") {
      const result = await checkMnemonic(input, words);
      setError(result.ok ? undefined : result.reason);
      if (result.ok) onImported();
      return;
    }
    if (mode === "key") {
      const result = checkPrivateKey(input);
      setError(result.ok ? undefined : result.reason);
      if (result.ok) onImported();
      return;
    }
    // Anything starting with 0x is an address attempt, never a name.
    const trimmed = input.trim();
    const ok = /^0x/i.test(trimmed) ? isAddress(trimmed) : checkName(trimmed).ok;
    setError(
      ok ? undefined : "Enter an address (0x and 40 characters, checksum intact) or a .rh name",
    );
    if (ok) onImported();
  }

  return (
    <form
      className="flex flex-col gap-6 pt-16"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h1 className="text-title1 font-bold">Import a wallet</h1>
      <SegmentedControl
        label="Import with"
        options={modes}
        value={mode}
        onChange={(next) => {
          setMode(next);
          setInput("");
          setError(undefined);
        }}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="import-input" className="text-footnote font-semibold text-ink-2">
          {modes.find((m) => m.value === mode)?.label}
        </label>
        <textarea
          id="import-input"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError(undefined);
          }}
          rows={mode === "phrase" ? 4 : 2}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          aria-describedby="import-help import-error"
          className="rounded-md bg-surface-2 p-3 font-mono text-body outline-none focus-visible:outline-2 focus-visible:outline-focus"
        />
        <p id="import-help" className="text-footnote text-ink-3">
          {help[mode]}
        </p>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Word suggestions">
          {suggestions.map((word) => (
            <Button
              key={word}
              variant="secondary"
              size="sm"
              onClick={() => {
                setInput(`${input.replace(/\S*$/, "")}${word} `);
              }}
            >
              {word}
            </Button>
          ))}
        </div>
      )}
      <p id="import-error" role="alert" className="text-footnote text-loss">
        {error ?? ""}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" size="lg" block disabled={input.trim() === ""}>
          Import
        </Button>
      </div>
    </form>
  );
}
