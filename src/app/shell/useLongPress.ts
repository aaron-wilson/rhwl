import { useRef } from "react";

const HOLD_MS = 600;

/**
 * A press held for 600 ms runs `onLong` and swallows the click that follows.
 * This times a gesture, not the demo, so it uses real time even when the demo
 * clock is frozen.
 */
export function useLongPress(onLong: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const cancel = () => {
    window.clearTimeout(timer.current);
  };
  return {
    onPointerDown: () => {
      fired.current = false;
      cancel();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLong();
      }, HOLD_MS);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onClick: (event: { preventDefault: () => void }) => {
      if (fired.current) event.preventDefault();
    },
  };
}
