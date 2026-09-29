import { describe, expect, it } from "vitest";
import { startingApprovals, type Approval } from "../../data/approvals";
import { approvalAgeDays, assessApproval, byRisk, STALE_DAYS } from "./risk";

const now = new Date("2026-09-29T16:00:00Z");
const ROUTER = "0x1111000000000000000000000000000000000001";
const base: Approval = {
  id: "x",
  account: "main",
  chain: "robinhood",
  assetId: "rh:USDG",
  spender: ROUTER,
  spenderName: "Hood Swap",
  allowance: 1n,
  grantedAt: new Date("2026-09-19T16:00:00Z"),
};
const days = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("approval risk", () => {
  it("is fine for a limited grant to a verified spender", () => {
    expect(assessApproval(base, now)).toEqual({ risk: "ok", reasons: [] });
  });

  it("notes an unlimited grant to a verified spender without alarm", () => {
    expect(assessApproval({ ...base, allowance: "unlimited" }, now)).toEqual({
      risk: "ok",
      reasons: ["Unlimited amount"],
    });
  });

  it("warns on an unlimited grant left open half a year", () => {
    const old = { ...base, allowance: "unlimited" as const, grantedAt: days(STALE_DAYS) };
    expect(assessApproval(old, now)).toEqual({
      risk: "warning",
      reasons: ["Unlimited amount", `Unused for ${STALE_DAYS} days`],
    });
  });

  it("warns on an unverified spender, whatever the amount", () => {
    const spender = "0x9999000000000000000000000000000000000009";
    expect(assessApproval({ ...base, spender }, now).risk).toBe("warning");
  });

  it("calls a drainer dangerous, first reason first", () => {
    const drainer = { ...base, spender: "0xDEAD0000000000000000000000000000000BEEF1" };
    const { risk, reasons } = assessApproval(drainer, now);
    expect(risk).toBe("danger");
    expect(reasons[0]).toBe("Spender has drained other wallets");
  });

  it("counts whole days and never goes negative", () => {
    expect(approvalAgeDays(base, now)).toBe(10);
    expect(approvalAgeDays({ ...base, grantedAt: days(-1) }, now)).toBe(0);
  });

  it("orders the seed riskiest first, then newest", () => {
    const ids = startingApprovals
      .filter((a) => a.account === "main")
      .sort(byRisk(now))
      .map((a) => a.id);
    expect(ids).toEqual(["a3", "a4", "a5", "a1", "a2"]);
  });
});
