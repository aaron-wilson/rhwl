import { ArrowLeftRight, Clock, House, Rocket, Settings, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

type Loader = () => Promise<ComponentType>;

export interface NavRoute {
  readonly path: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly load: Loader;
}

/** The five primary destinations. Router and navigation both read this list. */
export const navRoutes: readonly NavRoute[] = [
  {
    path: "/",
    label: "Home",
    icon: House,
    load: async () => (await import("../features/home/HomePage")).HomePage,
  },
  {
    path: "/trade",
    label: "Trade",
    icon: ArrowLeftRight,
    load: async () => (await import("../features/trade/TradePage")).TradePage,
  },
  {
    path: "/launch",
    label: "Launch",
    icon: Rocket,
    load: async () => (await import("../features/launch/LaunchPage")).LaunchPage,
  },
  {
    path: "/activity",
    label: "Activity",
    icon: Clock,
    load: async () => (await import("../features/activity/ActivityPage")).ActivityPage,
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    load: async () => (await import("../features/settings/SettingsPage")).SettingsPage,
  },
];

/** Warms a route's code before the user commits to it, so navigation feels instant. */
export function prefetch(route: NavRoute): void {
  void route.load();
}

/** Whether the browser asked for less data (Save-Data) or reports a 2G link. */
function lowData(): boolean {
  const connection: unknown = Reflect.get(navigator, "connection");
  if (typeof connection !== "object" || connection === null) return false;
  return (
    Reflect.get(connection, "saveData") === true ||
    String(Reflect.get(connection, "effectiveType")).endsWith("2g")
  );
}

/**
 * After first paint, once the page is idle, warms every tab's code. Phones have
 * no hover, and a touch starts the load only a moment before the tap lands.
 * Skipped when the visitor is saving data. Returns a cancel function.
 */
export function prefetchTabsWhenIdle(): () => void {
  if (lowData()) return () => undefined;
  const warm = () => {
    navRoutes.forEach(prefetch);
  };
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(warm, { timeout: 5000 });
    return () => {
      cancelIdleCallback(id);
    };
  }
  const id = setTimeout(warm, 2000);
  return () => {
    clearTimeout(id);
  };
}
