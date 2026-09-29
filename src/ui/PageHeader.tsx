import type { ReactNode } from "react";

interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly trailing?: ReactNode;
}

/** Apple-style large title. The page's only h1. */
export function PageHeader({ title, subtitle, trailing }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-4 pt-6 pb-4">
      <div className="flex flex-col">
        <h1 className="text-title1 font-bold">{title}</h1>
        {subtitle !== undefined && <p className="text-body text-ink-2">{subtitle}</p>}
      </div>
      {trailing}
    </header>
  );
}
