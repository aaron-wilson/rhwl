import { Bell } from "lucide-react";
import { Link } from "react-router";
import { icon } from "../../ui/icon";
import { useUnread } from "./inbox-store";

/** The way into the inbox, with the unread count. */
export function InboxBell() {
  const unread = useUnread();
  return (
    <Link
      to="/inbox"
      aria-label={unread === 0 ? "Inbox" : `Inbox, ${unread} unread`}
      className="relative flex size-10 items-center justify-center rounded-full text-ink-2"
    >
      <Bell {...icon()} />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-loss px-1 text-caption font-semibold text-on-loss"
        >
          {unread}
        </span>
      )}
    </Link>
  );
}
