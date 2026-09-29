import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { icon } from "./icon";

/** A card that navigates to a feature: a title, one line about it, and a chevron. */
export function NavCard({
  to,
  title,
  subtitle,
}: {
  readonly to: string;
  readonly title: string;
  readonly subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 shadow-sm transition-[transform,box-shadow] duration-base ease-standard hover:-translate-y-px hover:shadow-md"
    >
      <span className="flex flex-col">
        <span className="text-headline font-semibold">{title}</span>
        <span className="text-footnote text-ink-3">{subtitle}</span>
      </span>
      <ChevronRight {...icon()} className="text-ink-3" />
    </Link>
  );
}
