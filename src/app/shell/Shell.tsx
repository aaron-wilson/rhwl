import { useEffect } from "react";
import { Navigate, Outlet, ScrollRestoration } from "react-router";
import { InboxBell } from "../../features/inbox/InboxBell";
import { useNeedsOnboarding } from "../../features/onboarding/onboarding-store";
import { PaletteHost } from "../../features/palette/PaletteHost";
import { SearchButton } from "../../features/palette/SearchButton";
import { prefetchTabsWhenIdle } from "../routes";
import { PageTransition } from "./PageTransition";
import { Sidebar } from "./Sidebar";
import type { ShellSlots } from "./slots";
import { TabBar } from "./TabBar";

const slots: ShellSlots = { inboxBell: <InboxBell />, searchButton: <SearchButton /> };

/**
 * Phone: content above a blurred tab bar. From 1024 px: a sidebar beside the
 * content column. Pages that need a detail pane lay it out inside the column.
 */
export function Shell() {
  useEffect(prefetchTabsWhenIdle, []);
  if (useNeedsOnboarding()) return <Navigate to="/welcome" replace />;
  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 pb-40 lg:pb-0">
        <PageTransition>
          <Outlet context={slots} />
        </PageTransition>
      </main>
      <TabBar />
      <PaletteHost />
      <ScrollRestoration />
    </div>
  );
}
