import { domMax, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * The only door to the motion library. Components that need springs, layout
 * animation or drag wrap themselves in this, so motion loads with them and
 * never with the home route. Reduced-motion users get instant transitions.
 */
export function MaxMotion({ children }: { readonly children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
