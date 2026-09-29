import { Avatar } from "../../ui/Avatar";
import { Badge } from "../../ui/Badge";
import { Skeleton } from "../../ui/Skeleton";
import { TokenIcon } from "../../ui/TokenIcon";
import { Section } from "./Section";

export function IdentitySpecimens() {
  return (
    <>
      <Section title="Badges and identity">
        <div className="flex flex-wrap gap-2">
          <Badge>Simulated</Badge>
          <Badge tone="gain">+4.20%</Badge>
          <Badge tone="loss">−1.37%</Badge>
          <Badge tone="live">Agent active</Badge>
          <Badge tone="warn">Market closed</Badge>
          <Badge tone="accent">Tinted</Badge>
          <Badge splash="violet">AI</Badge>
          <Badge splash="orange">Autos</Badge>
          <Badge splash="lime">New launch</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(["sm", "md", "lg"] as const).map((size) => (
            <TokenIcon key={size} symbol="USDG" splash="teal" size={size} />
          ))}
          <TokenIcon symbol="$CHIPDOG" />
          <TokenIcon symbol="TSLA" badge="S" />
          <Avatar seed="0x44b1…9e0d" label="Degen" size="lg" />
          <Avatar seed="0x07cc…11aa" label="Main" />
        </div>
      </Section>
      <Section title="Loading">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      </Section>
    </>
  );
}
