import { ChevronLeft, ShieldAlert } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { VAULT_APY, vaultBalance, vaultEarned } from "../../domain/earn/vault";
import { amount, parseAmount, toDecimalString } from "../../domain/money/amount";
import { formatToken } from "../../domain/money/format";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Sheet } from "../../ui/Sheet";
import { useActiveAccount } from "../accounts";
import { Private } from "../privacy";
import { useHoldings } from "../transactions";
import { acknowledgeRisks, moveVault, useVault } from "./vault-store";

const risks = [
  "The rate is variable. It comes from the vault's lending and reward programs and can fall to zero.",
  "Funds sit in a smart contract. A bug or exploit could lose some or all of them.",
  "USDG is a stablecoin. If it loses its peg, the vault's value falls with it.",
  "This is not a bank deposit and is not insured by any government scheme.",
  "In this prototype the vault, its rate and its earnings are simulated.",
];

/** A USDG vault: deposit, watch it earn by the second, withdraw any time. */
export function EarnPage() {
  const account = useActiveAccount();
  const providers = useProviders();
  const holdings = useHoldings(account);
  const { position, acknowledged } = useVault(account);
  const [direction, setDirection] = useState<"deposit" | "withdraw">("deposit");
  const [text, setText] = useState("");
  const [moving, setMoving] = useState(false);
  const [reading, setReading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const inputId = useId();
  const now = useNow(1_000);

  const wallet = holdings.find((h) => h.assetId === "rh:USDG")?.quantity ?? amount(0n, 6);
  const balance = position === undefined ? amount(0n, 6) : vaultBalance(position, now);
  const earned = position === undefined ? amount(0n, 6) : vaultEarned(position, now);
  const available = direction === "deposit" ? wallet : balance;
  const parsed = parseAmount(text.trim(), 6);
  const value = parsed !== undefined && parsed.base > 0n ? parsed : undefined;
  const short = value !== undefined && value.base > available.base;
  const needsDisclosure = direction === "deposit" && !acknowledged;

  async function move() {
    if (value === undefined) return;
    if (needsDisclosure) {
      setReading(true);
      return;
    }
    setMoving(true);
    const change = direction === "deposit" ? value : amount(-value.base, value.decimals);
    const ok = await moveVault(providers, account, change);
    setMoving(false);
    if (ok) setText("");
  }

  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/trade"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Trade
      </Link>
      <PageHeader title="Earn" subtitle="A USDG vault that pays by the second" />
      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-headline font-semibold">USDG vault</span>
          <span className="text-title2 font-bold text-gain">
            {(VAULT_APY * 100).toFixed(2)}% APY
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-footnote text-ink-3">Your balance</span>
          <span className="text-large font-bold tabular-nums" data-testid="vault-balance">
            <Private>{formatToken(balance, "USDG")}</Private>
          </span>
          <span className="text-footnote text-gain tabular-nums" data-testid="vault-earned">
            Earned <Private>{formatToken(earned, "USDG")}</Private>
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setReading(true);
          }}
          className="flex items-center gap-2 self-start rounded-md text-footnote font-semibold text-accent"
        >
          <ShieldAlert {...icon()} />
          Read the risks
        </button>
      </Card>
      <SegmentedControl
        label="Direction"
        options={[
          { value: "deposit", label: "Deposit" },
          { value: "withdraw", label: "Withdraw" },
        ]}
        value={direction}
        onChange={(next) => {
          setDirection(next);
          setText("");
        }}
      />
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-footnote text-ink-3">
          <label htmlFor={inputId}>Amount in USDG</label>
          <span>
            Available <Private>{formatToken(available, "USDG")}</Private>
          </span>
        </div>
        <input
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          className="h-12 bg-transparent text-title2 font-bold tabular-nums outline-none"
        />
        <Button
          size="sm"
          variant="secondary"
          className="self-start"
          onClick={() => {
            setText(toDecimalString(available));
          }}
        >
          Max
        </Button>
        {short && <p className="text-footnote text-loss">More than is available</p>}
      </Card>
      <Button
        size="lg"
        block
        disabled={value === undefined || short || moving}
        loading={moving}
        onClick={() => void move()}
      >
        {direction === "deposit" ? "Deposit" : "Withdraw"}
      </Button>
      {reading && (
        <Sheet
          open
          onClose={() => {
            setReading(false);
          }}
          title="Before you deposit"
          description="What can go wrong with a yield vault"
        >
          <div className="flex flex-col gap-4">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-ink-2">
              {risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
            {!acknowledged && (
              <>
                <label className="flex items-center gap-2 text-body">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => {
                      setAccepted(event.target.checked);
                    }}
                  />
                  I understand these risks
                </label>
                <Button
                  size="lg"
                  block
                  disabled={!accepted}
                  onClick={() => {
                    acknowledgeRisks();
                    setReading(false);
                  }}
                >
                  Continue
                </Button>
              </>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
