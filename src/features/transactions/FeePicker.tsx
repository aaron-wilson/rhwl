import { useState } from "react";
import { assetById } from "../../data/assets";
import { speedOrder, speeds, type Speed } from "../../domain/fees/gas";
import { amount } from "../../domain/money/amount";
import { formatToken } from "../../domain/money/format";
import { Button } from "../../ui/Button";
import { cx } from "../../ui/cx";
import type { FeeOption } from "./fee-options";

/** Speed and the token the fee is paid in, behind a "Change fee" disclosure. */
export function FeePicker({
  options,
  option,
  speed,
  onSpeed,
  onOption,
  sponsoredLeft,
}: {
  readonly options: readonly FeeOption[];
  readonly option: FeeOption | undefined;
  readonly speed: Speed;
  readonly onSpeed: (speed: Speed) => void;
  readonly onOption: (id: string) => void;
  readonly sponsoredLeft: number;
}) {
  const [choosing, setChoosing] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        aria-expanded={choosing}
        onClick={() => {
          setChoosing(!choosing);
        }}
      >
        Change fee
      </Button>
      {choosing && (
        <div className="flex flex-col gap-3 rounded-md bg-surface-2 p-3">
          <div role="radiogroup" aria-label="Speed" className="grid grid-cols-3 gap-2">
            {speedOrder.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={speed === s}
                onClick={() => {
                  onSpeed(s);
                }}
                className={cx(
                  "flex flex-col items-center rounded-md p-2 text-footnote",
                  speed === s ? "bg-surface font-semibold shadow-sm" : "text-ink-2",
                )}
              >
                <span className="capitalize">{s}</span>
                <span className="text-caption text-ink-3">~{speeds[s].seconds}s</span>
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Pay fee with" className="flex flex-col gap-1">
            {options.map((o) => {
              const a = assetById(o.fee.assetId);
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={option?.id === o.id}
                  disabled={!o.affordable}
                  onClick={() => {
                    onOption(o.id);
                  }}
                  className={cx(
                    "flex items-center justify-between rounded-md px-3 py-2 text-footnote",
                    option?.id === o.id ? "bg-surface font-semibold shadow-sm" : "text-ink-2",
                    !o.affordable && "opacity-40",
                  )}
                >
                  <span>
                    {o.label}
                    {o.sponsored && ` · ${sponsoredLeft} left`}
                  </span>
                  <span className="tabular-nums">
                    {o.sponsored
                      ? "Free"
                      : formatToken(
                          amount(-o.fee.quantity.base, o.fee.quantity.decimals),
                          a.symbol,
                        )}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-caption text-ink-3">
            Paying in anything but ETH goes through a paymaster, which adds 10%.
          </p>
        </div>
      )}
    </div>
  );
}
