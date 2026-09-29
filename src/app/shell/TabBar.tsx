import { navRoutes } from "../routes";
import { NavLinkItem } from "./NavLinkItem";

/** Phone navigation. One of the three blurred surfaces. */
export function TabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 layer-nav flex border-t border-line bg-chrome pb-[max(var(--rh-space-2),env(safe-area-inset-bottom))] backdrop-blur-chrome lg:hidden"
    >
      {navRoutes.map((route) => (
        <NavLinkItem key={route.path} route={route} layout="tab" />
      ))}
    </nav>
  );
}
