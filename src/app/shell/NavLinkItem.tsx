import { NavLink } from "react-router";
import { cx } from "../../ui/cx";
import { icon } from "../../ui/icon";
import { prefetch, type NavRoute } from "../routes";

interface NavLinkItemProps {
  readonly route: NavRoute;
  readonly layout: "tab" | "side";
}

export function NavLinkItem({ route, layout }: NavLinkItemProps) {
  const Icon = route.icon;
  const warm = () => {
    prefetch(route);
  };
  return (
    <NavLink
      to={route.path}
      end={route.path === "/"}
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      className={({ isActive }) =>
        cx(
          "transition-[color,transform] duration-fast ease-standard active:scale-97",
          layout === "tab"
            ? "flex flex-1 flex-col items-center gap-1 pt-2 text-caption font-semibold"
            : "flex h-12 items-center gap-3 rounded-full px-4 text-headline font-semibold hover:bg-surface-2",
          isActive ? "text-accent" : "text-ink-2",
          isActive && layout === "side" && "bg-accent-soft hover:bg-accent-soft",
        )
      }
    >
      <Icon {...icon(layout === "tab" ? "lg" : "md")} />
      {route.label}
    </NavLink>
  );
}
