import { describe, expect, it } from "vitest";
import { memeTokens } from "../../data/memes";
import { gradeFor, rugRadar, type RadarInput } from "./rug-radar";

const clean: RadarInput = {
  devShareBps: 200,
  lpLock: { kind: "burned" },
  top10Bps: 2_000,
  cloneOf: undefined,
  deployer: { launches: 2, rugs: 0 },
  graduated: true,
};
const finding = (input: Partial<RadarInput>, factor: string) =>
  rugRadar({ ...clean, ...input }).findings.find((f) => f.factor === factor);

describe("Rug Radar scoring table", () => {
  it("scores a clean token 100, grade A", () => {
    expect(rugRadar(clean)).toMatchObject({ score: 100, grade: "A" });
  });

  it.each([
    [{ devShareBps: 300 }, "Dev wallet", "good", 0],
    [{ devShareBps: 301 }, "Dev wallet", "caution", 10],
    [{ devShareBps: 800 }, "Dev wallet", "caution", 10],
    [{ devShareBps: 801 }, "Dev wallet", "danger", 25],
    [{ lpLock: { kind: "locked", days: 90 } }, "Liquidity", "good", 0],
    [{ lpLock: { kind: "locked", days: 89 } }, "Liquidity", "caution", 10],
    [{ lpLock: { kind: "unlocked" } }, "Liquidity", "danger", 25],
    [{ top10Bps: 3_000 }, "Holders", "good", 0],
    [{ top10Bps: 5_000 }, "Holders", "caution", 10],
    [{ top10Bps: 5_001 }, "Holders", "danger", 20],
    [{ cloneOf: "CHIPDOG" }, "Contract", "danger", 15],
    [{ deployer: { launches: 0, rugs: 0 } }, "Deployer", "caution", 5],
    [{ deployer: { launches: 4, rugs: 1 } }, "Deployer", "danger", 10],
    [{ deployer: { launches: 9, rugs: 5 } }, "Deployer", "danger", 30],
    [{ graduated: false }, "Curve", "caution", 5],
  ] as const)("%o → %s %s, −%d", (input, factor, verdict, penalty) => {
    expect(finding(input, factor)).toMatchObject({ verdict, penalty });
  });

  it.each([
    [100, "A"],
    [90, "A"],
    [89, "B"],
    [75, "B"],
    [74, "C"],
    [60, "C"],
    [59, "D"],
    [40, "D"],
    [39, "F"],
    [0, "F"],
  ] as const)("score %d is grade %s", (score, grade) => {
    expect(gradeFor(score)).toBe(grade);
  });

  it("never scores below zero", () => {
    expect(
      rugRadar({
        devShareBps: 5_000,
        lpLock: { kind: "unlocked" },
        top10Bps: 9_000,
        cloneOf: "X",
        deployer: { launches: 9, rugs: 9 },
        graduated: false,
      }).score,
    ).toBe(0);
  });

  it("gives every seeded meme a fixed grade", () => {
    const grades = Object.fromEntries(
      memeTokens.map((m) => {
        const radar = rugRadar({
          ...m.risk,
          devShareBps: m.devShareBps,
          graduated: m.curve.graduated,
        });
        return [m.symbol, `${radar.grade} ${radar.score}`];
      }),
    );
    expect(grades).toEqual({
      CHIPDOG: "A 100",
      ORCHARD: "B 75",
      ROBOTAXI: "F 0",
      BASKET: "A 100",
      TENDIES: "C 65",
      HOODIE: "A 95",
      SEALTEAM: "D 40",
      PAWS: "F 20",
    });
  });
});
