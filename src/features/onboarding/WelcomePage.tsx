import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { NAME_SUFFIX } from "../../domain/onboarding/names";
import { showToast } from "../../ui/toast";
import { dispatchOnboarding, useOnboarding } from "./onboarding-store";
import { ImportStep } from "./ImportStep";
import { MethodStep } from "./MethodStep";
import { NameStep } from "./NameStep";
import { PhraseStep } from "./PhraseStep";
import { QuizStep } from "./QuizStep";
import { PasskeyStep } from "./PasskeyStep";
import { RegionStep } from "./RegionStep";
import { SplashStep } from "./SplashStep";

/** The first-run flow, one step per screen, driven by the onboarding state machine. */
export function WelcomePage() {
  const onboarding = useOnboarding();
  const navigate = useNavigate();
  // The phrase lives only in this component's memory: never in a store, storage or URL.
  const [phrase, setPhrase] = useState<readonly string[]>([]);

  useEffect(() => {
    if (onboarding.step !== "done" || onboarding.name === undefined) return;
    showToast(`Welcome, ${onboarding.name}${NAME_SUFFIX}`, "success");
    void navigate("/", { replace: true });
  }, [onboarding, navigate]);

  return (
    <main className="mx-auto min-h-dvh max-w-phone px-6">
      {onboarding.step === "splash" && (
        <SplashStep
          onStart={() => {
            dispatchOnboarding({ type: "start" });
          }}
        />
      )}
      {onboarding.step === "method" && <MethodStep />}
      {onboarding.step === "phrase" && (
        <PhraseStep
          onSaved={(words) => {
            setPhrase(words);
            dispatchOnboarding({ type: "phrase_saved" });
          }}
        />
      )}
      {onboarding.step === "quiz" && (
        <QuizStep
          phrase={phrase}
          onPassed={() => {
            dispatchOnboarding({ type: "quiz_passed" });
          }}
          onBack={() => {
            dispatchOnboarding({ type: "back" });
          }}
        />
      )}
      {onboarding.step === "import" && (
        <ImportStep
          onImported={() => {
            dispatchOnboarding({ type: "imported" });
          }}
          onBack={() => {
            dispatchOnboarding({ type: "back" });
          }}
        />
      )}
      {onboarding.step === "passkey" && (
        <PasskeyStep
          onCreated={() => {
            dispatchOnboarding({ type: "passkey_created" });
          }}
        />
      )}
      {onboarding.step === "name" && (
        <NameStep
          onClaim={(name) => {
            dispatchOnboarding({ type: "claim_name", name });
          }}
        />
      )}
      {onboarding.step === "region" && (
        <RegionStep
          onChoose={(region) => {
            dispatchOnboarding({ type: "choose_region", region });
          }}
          onBack={() => {
            dispatchOnboarding({ type: "back" });
          }}
        />
      )}
    </main>
  );
}
