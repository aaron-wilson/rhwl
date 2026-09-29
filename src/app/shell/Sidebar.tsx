import { Link } from "react-router";
import { AccountButton } from "../../features/accounts/AccountButton";
import { InboxBell } from "../../features/inbox/InboxBell";
import { SearchButton } from "../../features/palette/SearchButton";
import { Lockup } from "../../ui/brand/Mark";
import { navRoutes } from "../routes";
import { togglePresenter } from "../presenter";
import { NavLinkItem } from "./NavLinkItem";
import { useLongPress } from "./useLongPress";

/** Desktop navigation from 1024 px. */
export function Sidebar() {
  // A long press on the logo is the hidden way into presenter mode.
  const logoPress = useLongPress(togglePresenter);
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r border-line p-6 lg:flex">
      <div className="flex items-center justify-between">
        <Link to="/" aria-label="Wallet home" className="rounded-md" {...logoPress}>
          <Lockup />
        </Link>
        <div className="flex">
          <SearchButton />
          <InboxBell />
        </div>
      </div>
      <nav aria-label="Primary" className="flex flex-col gap-1">
        {navRoutes.map((route) => (
          <NavLinkItem key={route.path} route={route} layout="side" />
        ))}
      </nav>
      <div className="mt-auto">
        <AccountButton />
      </div>
    </aside>
  );
}
