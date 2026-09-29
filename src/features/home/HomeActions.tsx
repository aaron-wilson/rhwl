import { ArrowDown, ArrowDownUp, ArrowUp, Landmark, Waypoints } from "lucide-react";
import { Link } from "react-router";
import { icon } from "../../ui/icon";

const actions = [
  { to: "/send", label: "Send", Icon: ArrowUp },
  { to: "/receive", label: "Receive", Icon: ArrowDown },
  { to: "/swap", label: "Swap", Icon: ArrowDownUp },
  { to: "/bridge", label: "Bridge", Icon: Waypoints },
  { to: "/transfer", label: "Transfer", Icon: Landmark },
] as const;

/** The money-moving doorways under the total. */
export function HomeActions() {
  return (
    <nav aria-label="Actions" className="flex justify-between">
      {actions.map(({ to, label, Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-1 flex-col items-center gap-1 rounded-md text-footnote font-semibold text-ink-2 hover:text-ink"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-on-accent">
            <Icon {...icon()} />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
