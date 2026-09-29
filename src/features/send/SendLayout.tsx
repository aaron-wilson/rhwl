import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";

/** The Send screen's frame: back to Home, the title and who is sending. */
export function SendLayout({
  title = "Send",
  subtitle,
  children,
}: {
  readonly title?: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-phone flex-col gap-6 px-4 pt-4 pb-8">
      <Link
        to="/"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Home
      </Link>
      <PageHeader title={title} {...(subtitle === undefined ? {} : { subtitle })} />
      {children}
    </div>
  );
}
