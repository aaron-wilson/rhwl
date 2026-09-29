import type { MemeRisk } from "../../data/types";

export type Verdict = "good" | "caution" | "danger";
export type Grade = "A" | "B" | "C" | "D" | "F";

export interface Finding {
  readonly factor: "Dev wallet" | "Liquidity" | "Holders" | "Contract" | "Deployer" | "Curve";
  readonly verdict: Verdict;
  readonly message: string;
  /** Points taken off the score of 100. */
  readonly penalty: number;
}

export interface Radar {
  readonly score: number;
  readonly grade: Grade;
  readonly findings: readonly Finding[];
}

export interface RadarInput extends MemeRisk {
  readonly devShareBps: number;
  readonly graduated: boolean;
}

const pct = (bps: number) =>
  `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

/**
 * The scoring table. Each factor is judged on its own and takes points off a
 * score of 100; the grade comes from what is left.
 */
export function rugRadar(input: RadarInput): Radar {
  const findings: Finding[] = [];
  const add = (factor: Finding["factor"], verdict: Verdict, message: string, penalty: number) => {
    findings.push({ factor, verdict, message, penalty });
  };

  const dev = input.devShareBps;
  if (dev <= 300) add("Dev wallet", "good", `The dev wallet holds ${pct(dev)}`, 0);
  else if (dev <= 800) add("Dev wallet", "caution", `The dev wallet holds ${pct(dev)}`, 10);
  else
    add("Dev wallet", "danger", `The dev wallet holds ${pct(dev)}, enough to crash the price`, 25);

  const lp = input.lpLock;
  if (lp.kind === "burned") add("Liquidity", "good", "Liquidity tokens are burned", 0);
  else if (lp.kind === "locked" && lp.days >= 90)
    add("Liquidity", "good", `Liquidity is locked for ${lp.days} days`, 0);
  else if (lp.kind === "locked")
    add("Liquidity", "caution", `Liquidity is locked for only ${lp.days} days`, 10);
  else add("Liquidity", "danger", "Liquidity is unlocked and can be pulled", 25);

  const top = input.top10Bps;
  if (top <= 3_000) add("Holders", "good", `The top 10 holders own ${pct(top)}`, 0);
  else if (top <= 5_000) add("Holders", "caution", `The top 10 holders own ${pct(top)}`, 10);
  else add("Holders", "danger", `The top 10 holders own ${pct(top)}`, 20);

  if (input.cloneOf === undefined) add("Contract", "good", "Original contract code", 0);
  else add("Contract", "danger", `The contract copies ${input.cloneOf}'s bytecode`, 15);

  const { launches, rugs } = input.deployer;
  if (rugs > 0) {
    add(
      "Deployer",
      "danger",
      `${rugs} of the deployer's ${launches} earlier launches rugged`,
      Math.min(30, rugs * 10),
    );
  } else if (launches === 0) {
    add("Deployer", "caution", "First launch from this deployer", 5);
  } else {
    add("Deployer", "good", `None of the deployer's ${launches} earlier launches rugged`, 0);
  }

  if (input.graduated) add("Curve", "good", "Graduated to an open pool", 0);
  else add("Curve", "caution", "Still on its bonding curve; the curve is the only liquidity", 5);

  const score = Math.max(0, 100 - findings.reduce((sum, f) => sum + f.penalty, 0));
  return { score, grade: gradeFor(score), findings };
}

export function gradeFor(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
