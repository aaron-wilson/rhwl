import { ArrowLeft, Download, KeyRound, ScrollText } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { dispatchOnboarding } from "./onboarding-store";

function Option(props: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly badge?: string;
  readonly body: string;
  readonly action: string;
  readonly primary?: boolean;
  readonly onChoose: () => void;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {props.icon}
        <span className="flex-1 text-headline font-semibold">{props.title}</span>
        {props.badge !== undefined && <Badge tone="accent">{props.badge}</Badge>}
      </div>
      <p className="text-body text-ink-2">{props.body}</p>
      <Button
        size="lg"
        block
        variant={props.primary === true ? "primary" : "secondary"}
        onClick={props.onChoose}
      >
        {props.action}
      </Button>
    </Card>
  );
}

export function MethodStep() {
  return (
    <section className="flex flex-col gap-4 pt-16 pb-12">
      <button
        type="button"
        onClick={() => {
          dispatchOnboarding({ type: "back" });
        }}
        className="flex size-10 items-center justify-center self-start rounded-full bg-surface-2"
        aria-label="Back"
      >
        <ArrowLeft {...icon()} />
      </button>
      <h1 className="text-title1 font-bold">How do you want to sign?</h1>
      <Option
        icon={<KeyRound {...icon("lg")} className="text-accent" />}
        title="Passkey"
        badge="Recommended"
        body="Face ID or your device PIN signs for you. Nothing to write down, nothing to lose in a drawer."
        action="Continue with passkey"
        primary
        onChoose={() => {
          dispatchOnboarding({ type: "choose_passkey" });
        }}
      />
      <Option
        icon={<ScrollText {...icon("lg")} className="text-ink-2" />}
        title="Recovery phrase"
        body="Twelve words you write down and keep offline. The classic self-custody backup."
        action="Create a recovery phrase"
        onChoose={() => {
          dispatchOnboarding({ type: "choose_phrase" });
        }}
      />
      <Option
        icon={<Download {...icon("lg")} className="text-ink-2" />}
        title="I already have a wallet"
        body="Import a recovery phrase or private key, or watch an address."
        action="Import a wallet"
        onChoose={() => {
          dispatchOnboarding({ type: "choose_import" });
        }}
      />
    </section>
  );
}
