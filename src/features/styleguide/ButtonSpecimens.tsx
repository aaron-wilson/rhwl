import { ArrowDownLeft, ArrowUpRight, Repeat } from "lucide-react";
import { Button, type ButtonVariant } from "../../ui/Button";
import { icon } from "../../ui/icon";
import { Section } from "./Section";

const variants: readonly ButtonVariant[] = ["primary", "secondary", "ghost", "destructive", "live"];

export function ButtonSpecimens() {
  return (
    <Section title="Buttons">
      {variants.map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-2">
          <Button variant={variant} size="lg">
            Review swap
          </Button>
          <Button variant={variant}>Buy NVDA</Button>
          <Button variant={variant} size="sm">
            Max
          </Button>
          <Button variant={variant} loading>
            Signing
          </Button>
          <Button variant={variant} disabled>
            Insufficient ETH
          </Button>
        </div>
      ))}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" icon={<ArrowUpRight {...icon()} />}>
          Send
        </Button>
        <Button variant="secondary" icon={<ArrowDownLeft {...icon()} />}>
          Receive
        </Button>
        <Button variant="secondary" icon={<Repeat {...icon()} />}>
          Swap
        </Button>
      </div>
    </Section>
  );
}
