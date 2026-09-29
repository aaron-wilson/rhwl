import { Fragment, lazy, Suspense, useCallback, useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { PendingIsland } from "../features/transactions/PendingIsland";
import { SignerHost } from "../features/transactions/SignerHost";
import { AccountSheetHost } from "../features/accounts/AccountSheetHost";
import { LockGate } from "../features/lock/LockGate";
import { useStore } from "../lib/store";
import { useTourStep } from "../features/tour/tour-store";
import { displayCurrencyStore } from "../domain/money/display";
import { Toaster } from "../ui/Toaster";
import { ProvidersContext } from "./providers-context";
import { createChunkLoader } from "./chunk-retry";
import { createAppRouter } from "./router";
import { onPresenterKey, presenterStore, usePresenter } from "./presenter";
import { PhoneFrame } from "./shell/PhoneFrame";
import { PresenterBar } from "./shell/PresenterBar";
import type { Startup } from "./startup";
import { useApplyTint } from "./tint";
import type { Session } from "./session";
import { SessionContext } from "./session-context";

interface AppProps {
  readonly session: Session;
  /** Reloads the page once when a route's code is missing after a deploy. */
  readonly reload?: () => void;
  /** The URL levers that act after mount: ?step and ?presenter. */
  readonly startup?: Pick<Startup, "freeze" | "step" | "presenter" | "frame" | "scenario">;
}

const Tour = lazy(async () => ({ default: (await import("../features/tour/Tour")).Tour }));

function reloadPage(): void {
  window.location.reload();
}

export function App({ session, reload = reloadPage, startup }: AppProps) {
  const providers = useStore(session.providers);
  // Money is formatted outside React state, so a new display currency redraws the app.
  const currency = useStore(displayCurrencyStore);
  const [router] = useState(() =>
    createAppRouter(
      createChunkLoader({
        clock: () => session.providers.get().clock,
        sessionStorage: () => session.providers.get().sessionStorage,
        reload,
      }),
    ),
  );
  useApplyTint();
  // The inbox watcher loads after first paint, so it costs the home route nothing.
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import("../features/inbox/watch").then(({ startInbox }) => {
      if (!cancelled) stop = startInbox(providers);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [providers]);
  const presenter = usePresenter();
  const tourStep = useTourStep();
  const navigate = useCallback((to: string) => void router.navigate(to), [router]);
  useEffect(() => {
    if (startup?.presenter === true) presenterStore.set((p) => ({ ...p, on: true }));
    window.addEventListener("keydown", onPresenterKey);
    return () => {
      window.removeEventListener("keydown", onPresenterKey);
    };
  }, [startup?.presenter]);
  const step = startup?.freeze === true ? startup.step : undefined;
  useEffect(() => {
    if (step !== undefined) session.providers.get().demo?.advanceClock(step);
  }, [session, step]);
  if (presenter.on && presenter.frame && startup?.frame !== true) return <PhoneFrame />;
  return (
    <SessionContext.Provider value={session}>
      <ProvidersContext.Provider value={providers}>
        <LockGate>
          {presenter.on && (
            <PresenterBar framed={startup?.frame === true} scenario={startup?.scenario} />
          )}
          <Fragment key={currency}>
            <RouterProvider router={router} />
            <PendingIsland />
          </Fragment>
          {tourStep !== undefined && (
            <Suspense fallback={null}>
              <Tour step={tourStep} navigate={navigate} />
            </Suspense>
          )}
          <Toaster clock={providers.clock} />
          <SignerHost />
          <AccountSheetHost />
        </LockGate>
      </ProvidersContext.Provider>
    </SessionContext.Provider>
  );
}
