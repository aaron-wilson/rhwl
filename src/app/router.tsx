import type { ComponentType } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import type { ChunkLoader } from "./chunk-retry";
import { RouteError } from "./RouteError";
import { HomePage } from "../features/home/HomePage";
import { navRoutes } from "./routes";
import { Shell } from "./shell/Shell";
import { ShellFallback } from "./shell/ShellFallback";

type Page = () => Promise<ComponentType>;

/** Pages inside the shell beyond the five tabs, as path and lazy component. */
const shellPages: readonly (readonly [string, Page])[] = [
  ["earn", () => import("../features/earn/EarnPage").then((m) => m.EarnPage)],
  ["perps", () => import("../features/perps/PerpsPage").then((m) => m.PerpsPage)],
  ["tax", () => import("../features/tax/TaxPage").then((m) => m.TaxPage)],
  ["earnings", () => import("../features/earnings/EarningsPage").then((m) => m.EarningsPage)],
  [
    "earnings/:slug",
    () => import("../features/earnings/EarningsNightPage").then((m) => m.EarningsNightPage),
  ],
  ["rooms/:slug", () => import("../features/rooms/RoomPage").then((m) => m.RoomPage)],
  ["agent", () => import("../features/agent/AgentPage").then((m) => m.AgentPage)],
  [
    "guardrails",
    () => import("../features/guardrails/GuardrailsPage").then((m) => m.GuardrailsPage),
  ],
  ["verify", () => import("../features/flex/VerifyPage").then((m) => m.VerifyPage)],
  ["tendies", () => import("../features/basket/TendiesPage").then((m) => m.TendiesPage)],
  ["transfer", () => import("../features/rail/RailPage").then((m) => m.RailPage)],
  ["bridge", () => import("../features/bridge/BridgePage").then((m) => m.BridgePage)],
  ["swap", () => import("../features/swap/SwapPage").then((m) => m.SwapPage)],
  ["send", () => import("../features/send/SendPage").then((m) => m.SendPage)],
  ["receive", () => import("../features/receive/ReceivePage").then((m) => m.ReceivePage)],
  [
    "collectibles",
    () => import("../features/collectibles/CollectiblesPage").then((m) => m.CollectiblesPage),
  ],
  [
    "collectibles/:id",
    () => import("../features/collectibles/CollectiblePage").then((m) => m.CollectiblePage),
  ],
  ["inbox", () => import("../features/inbox/InboxPage").then((m) => m.InboxPage)],
  ["security", () => import("../features/security/SecurityPage").then((m) => m.SecurityPage)],
  ["approvals", () => import("../features/approvals/ApprovalsPage").then((m) => m.ApprovalsPage)],
  ["browse", () => import("../features/dapps/BrowserPage").then((m) => m.BrowserPage)],
  [
    "connected-sites",
    () => import("../features/dapps/ConnectedSitesPage").then((m) => m.ConnectedSitesPage),
  ],
  ["browse/:id", () => import("../features/dapps/DappPage").then((m) => m.DappPage)],
  ["asset/:slug", () => import("../features/asset/AssetPage").then((m) => m.AssetPage)],
  ["*", () => import("./NotFoundPage").then((m) => m.NotFoundPage)],
];

/** Every path inside the shell, for checks that must cover all of them. */
export const shellPagePaths: readonly string[] = shellPages.map(([path]) => path);

/**
 * Every lazy route loads through `loadChunk` and has its own error boundary.
 * Boundaries sit on the pages, below the shell, so the tabs and the pending
 * island survive a page that throws.
 */
export function createAppRouter(loadChunk: ChunkLoader) {
  const lazyRoute = (page: Page) => ({
    lazy: async () => {
      try {
        return { Component: await loadChunk(page) };
      } catch (error) {
        // React Router drops a rejected `lazy` on routes without a loader; rethrow while rendering instead.
        return {
          Component: () => {
            throw error;
          },
        };
      }
    },
    errorElement: <RouteError />,
  });
  const pages: RouteObject[] = [
    // Home is the landing page: bundled with the entry, so first paint waits on one round trip, not two.
    { index: true, Component: HomePage, errorElement: <RouteError /> },
    ...navRoutes
      .filter((route) => route.path !== "/")
      .map((route) => ({ path: route.path.slice(1), ...lazyRoute(route.load) })),
    ...shellPages.map(([path, page]) => ({ path, ...lazyRoute(page) })),
  ];
  return createBrowserRouter([
    {
      path: "/",
      Component: Shell,
      HydrateFallback: ShellFallback,
      errorElement: <RouteError />,
      children: pages,
    },
    {
      path: "/welcome",
      HydrateFallback: ShellFallback,
      ...lazyRoute(() => import("../features/onboarding/WelcomePage").then((m) => m.WelcomePage)),
    },
    {
      path: "/styleguide",
      HydrateFallback: ShellFallback,
      ...lazyRoute(() =>
        import("../features/styleguide/StyleguidePage").then((m) => m.StyleguidePage),
      ),
    },
  ]);
}
