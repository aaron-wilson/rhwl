import { useState } from "react";
import { Button } from "../../ui/Button";
import { ListRow } from "../../ui/ListRow";
import { Sheet } from "../../ui/Sheet";
import { showToast } from "../../ui/toast";
import { TokenIcon } from "../../ui/TokenIcon";
import { Section } from "./Section";

export function OverlaySpecimens() {
  const [sheet, setSheet] = useState(false);
  const close = () => {
    setSheet(false);
  };
  return (
    <Section title="Overlays">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setSheet(true);
          }}
        >
          Open sheet
        </Button>
        <Button variant="secondary" onClick={() => showToast("Address copied", "success")}>
          Success toast
        </Button>
        <Button variant="secondary" onClick={() => showToast("Quote expired", "error")}>
          Error toast
        </Button>
        <Button
          variant="secondary"
          onClick={() => showToast("Bridging to Robinhood Chain", "live")}
        >
          Live toast
        </Button>
      </div>
      <Sheet
        open={sheet}
        onClose={close}
        title="Review swap"
        description="Simulated · quote refreshes in 15s"
      >
        <div className="flex flex-col gap-4">
          <ListRow
            leading={<TokenIcon symbol="USDG" splash="teal" />}
            title="You pay"
            trailing="500.00 USDG"
          />
          <ListRow
            leading={<TokenIcon symbol="NVDA" splash="violet" badge="S" />}
            title="You receive"
            trailing="2.6771 NVDA"
          />
          <Button
            size="lg"
            block
            onClick={() => {
              close();
              showToast("Swap submitted", "live");
            }}
          >
            Confirm swap
          </Button>
        </div>
      </Sheet>
    </Section>
  );
}
