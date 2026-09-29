import { Bot, ChevronLeft } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { assets } from "../../data/assets";
import { describeRule } from "../../domain/agent/describe";
import { examples, parseRule } from "../../domain/agent/grammar";
import type { ParseResult } from "../../domain/agent/rule";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useActiveAccount } from "../accounts";
import { signMessageAs } from "../transactions/actions";
import { useAgent } from "./agent-store";
import { AgentFeed, AgentKeys } from "./AgentKeys";
import { PolicyCard } from "./PolicyCard";
import { grantKey } from "./runner";

const tradable = assets.filter((a) => a.chain === "robinhood" && a.kind !== "stable");
const lookup = (symbol: string) => tradable.find((a) => a.symbol === symbol)?.id;
const symbolOf = (id: string) => tradable.find((a) => a.id === id)?.symbol ?? id;

/** Plain-language rules compiled into a readable policy and a scoped session key, with a kill switch. */
export function AgentPage() {
  const providers = useProviders();
  const account = useActiveAccount();
  const { keys, feed } = useAgent();
  const now = useNow();
  const inputId = useId();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<ParseResult | undefined>(undefined);
  const [granting, setGranting] = useState(false);

  function compile(text: string) {
    setPrompt(text);
    setResult(parseRule(text, providers.clock.now(), lookup));
  }

  async function grant() {
    if (result?.ok !== true) return;
    const rows = describeRule(result.rule, symbolOf);
    setGranting(true);
    const signed = await signMessageAs(account, {
      payload: JSON.stringify({ grant: prompt, scope: rows }),
      display: [
        "Allow the agent to act for you:",
        ...rows.map((r) => `${r.label}: ${r.value}`),
      ].join("\n"),
    });
    setGranting(false);
    if (signed === undefined) return;
    grantKey(providers, account, prompt, result.rule);
    setPrompt("");
    setResult(undefined);
  }

  return (
    <div className="mx-auto flex max-w-phone flex-col gap-6 px-4 pt-4 pb-8">
      <Link
        to="/trade"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Trade
      </Link>
      <PageHeader
        title="Agent"
        subtitle="Rules in plain words, run for you within a key you sign"
      />
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          compile(prompt);
        }}
      >
        <label htmlFor={inputId} className="px-1 text-footnote font-semibold text-ink-3">
          Tell the agent what to do
        </label>
        <input
          id={inputId}
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setResult(undefined);
          }}
          placeholder={examples.buy}
          autoComplete="off"
          className="h-12 w-full rounded-md bg-surface-2 px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus"
        />
        <div className="flex flex-wrap gap-2">
          {Object.values(examples).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                compile(e);
              }}
              className="rounded-full bg-surface-2 px-3 py-1 text-footnote text-ink-2 hover:text-ink"
            >
              {e}
            </button>
          ))}
        </div>
        <Button
          type="submit"
          variant="secondary"
          icon={<Bot {...icon()} />}
          disabled={prompt.trim() === ""}
        >
          Compile rule
        </Button>
      </form>
      {result !== undefined && !result.ok && (
        <Card role="alert" className="flex flex-col gap-1 text-footnote">
          <span className="text-loss">{result.reason}</span>
          <span className="text-ink-3">For example: “{result.example}”</span>
        </Card>
      )}
      {result?.ok === true && (
        <section aria-label="Compiled rule" className="flex flex-col gap-3">
          <PolicyCard rule={result.rule} />
          <Button size="lg" block loading={granting} onClick={() => void grant()}>
            Sign and grant key
          </Button>
        </section>
      )}
      <AgentKeys keys={keys} now={now} />
      <AgentFeed feed={feed} now={now} />
    </div>
  );
}
