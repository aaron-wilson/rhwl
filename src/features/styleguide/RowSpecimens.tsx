import { Avatar } from "../../ui/Avatar";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { ListRow } from "../../ui/ListRow";
import { showToast } from "../../ui/toast";
import { TokenIcon } from "../../ui/TokenIcon";
import { Section } from "./Section";

export function RowSpecimens() {
  return (
    <Section title="Rows and cards">
      <Card padding="list" className="flex flex-col">
        <ListRow
          leading={<TokenIcon symbol="NVDA" splash="violet" badge="S" />}
          title="NVIDIA"
          subtitle="12.408 NVDA · Stock Token"
          trailing="$2,318.40"
          trailingSub={<span className="text-gain">+2.14%</span>}
          onClick={() => showToast("Opened NVIDIA")}
        />
        <ListRow
          leading={<TokenIcon symbol="ETH" splash="sky" />}
          title="Ether"
          subtitle="1.2044 ETH"
          trailing="$3,902.11"
          trailingSub={<span className="text-loss">−0.86%</span>}
          onClick={() => showToast("Opened Ether")}
        />
        <ListRow
          leading={<Avatar seed="0x8f3a…c21e" label="you.rh" />}
          title="you.rh"
          subtitle="0x8f3a…c21e"
          trailing={<Badge tone="live">Pending</Badge>}
        />
      </Card>
      <Card interactive className="flex flex-col gap-1">
        <span className="text-footnote text-ink-3">Weekend gap</span>
        <span className="text-title2 font-bold tabular-nums">+1.8%</span>
        <span className="text-footnote text-ink-2">vs Friday close across 4 stock tokens</span>
      </Card>
    </Section>
  );
}
