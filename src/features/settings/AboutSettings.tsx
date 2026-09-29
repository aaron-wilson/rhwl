import { useState } from "react";
import { Link } from "react-router";
import { useSession } from "../../app/session-context";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { LazySheet } from "../../ui/LazySheet";

/** What this is, honestly, and the way back to the seeded start. */
export function AboutSettings() {
  const { resetDemo } = useSession();
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-footnote font-semibold text-ink-3">About</h2>
      <Card className="flex flex-col gap-3 text-body text-ink-2">
        <p>
          An independent prototype of a self-custody wallet for Robinhood Chain. It is not
          affiliated with Robinhood. Every balance, price and transaction is simulated, and no keys
          or funds exist.
        </p>
        <Link to="/styleguide" className="self-start font-semibold text-accent">
          Open the styleguide
        </Link>
        <Button
          variant="secondary"
          onClick={() => {
            setConfirming(true);
          }}
        >
          Reset demo
        </Button>
      </Card>
      <LazySheet
        open={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        title="Reset the demo?"
        description="Balances, activity, positions, alerts and connections go back to the seeded start. Theme, currency and other preferences stay."
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            block
            onClick={() => {
              setConfirming(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            block
            onClick={() => {
              resetDemo();
              setConfirming(false);
            }}
          >
            Reset demo
          </Button>
        </div>
      </LazySheet>
    </section>
  );
}
