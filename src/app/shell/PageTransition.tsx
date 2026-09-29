import type { ReactNode } from "react";
import { useLocation } from "react-router";

/** Fades each new page in with a small rise. No exit animation, so nothing shifts. */
export function PageTransition({ children }: { readonly children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
