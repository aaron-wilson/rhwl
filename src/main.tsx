import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { parseEnv } from "./config/env";
import { App } from "./app/App";
import { createProviders, loadInstant } from "./app/composition";
import { hydrate } from "./app/persistence";
import { createSession } from "./app/session";
import { readStartup } from "./app/startup";
import { needsOnboardingStore } from "./features/onboarding/onboarding-store";
import "./styles/app.css";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("Root element #root is missing from index.html");
}

const env = parseEnv(import.meta.env);
const startup = readStartup(window.location.search, loadInstant());
const session = createSession(
  () => createProviders(env, startup),
  () => {
    if (startup.scenario === "fresh-install") needsOnboardingStore.set(true);
  },
);
hydrate(session.providers.get().storage);

createRoot(container).render(
  <StrictMode>
    <App session={session} startup={startup} />
  </StrictMode>,
);
