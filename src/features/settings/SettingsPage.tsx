import { NavCard } from "../../ui/NavCard";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { autoLockOptions, autoLockStore, lockNow, useAutoLock } from "../lock";
import { PageHeader } from "../../ui/PageHeader";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { AboutSettings } from "./AboutSettings";
import { DisplaySettings } from "./DisplaySettings";
import { NetworksSettings } from "./NetworksSettings";

export function SettingsPage() {
  const autoLock = useAutoLock();
  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-4 sm:px-8">
      <PageHeader title="Settings" />
      <DisplaySettings />
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-footnote font-semibold text-ink-3">Security</h2>
        <Card className="flex flex-col gap-3">
          <span className="text-body font-semibold">Auto-lock</span>
          <SegmentedControl
            label="Auto-lock after"
            options={autoLockOptions}
            value={autoLock}
            onChange={(next) => {
              autoLockStore.set(next);
            }}
          />
          <Button variant="secondary" onClick={lockNow}>
            Lock now
          </Button>
        </Card>
        <NavCard
          to="/tax"
          title="Tax lots"
          subtitle="FIFO lots, realized and unrealized, CSV export"
        />
        <NavCard
          to="/browse"
          title="Apps"
          subtitle="Open a site in the wallet and connect an account"
        />
        <NavCard
          to="/security"
          title="Security"
          subtitle="Your security score, and one-tap fixes"
        />
        <NavCard
          to="/approvals"
          title="Approvals"
          subtitle="Who may spend your tokens; revoke many in one signature"
        />
        <NavCard
          to="/connected-sites"
          title="Connected sites"
          subtitle="See which sites can see an account, and disconnect them"
        />
        <NavCard
          to="/guardrails"
          title="Guardrails"
          subtitle="Meme budget, leverage cap, sleep on it, cool-off"
        />
      </section>
      <NetworksSettings />
      <AboutSettings />
    </div>
  );
}
