import type { ReactNode } from "react";

export function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export type Theme = "light" | "dark";
