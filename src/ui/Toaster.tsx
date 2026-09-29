import { CircleAlert, CircleCheck, Info, LoaderCircle } from "lucide-react";
import { cx } from "./cx";
import { icon } from "./icon";
import { useEffect, useRef } from "react";
import type { Clock } from "../ports/clock";
import { dismissToast, TOAST_VISIBLE_MS, useToasts, type ToastTone } from "./toast";

const icons: Record<ToastTone, typeof Info> = {
  neutral: Info,
  success: CircleCheck,
  error: CircleAlert,
  live: LoaderCircle,
};

const iconTone: Record<ToastTone, string> = {
  neutral: "text-ink-2",
  success: "text-gain",
  error: "text-loss",
  live: "text-live",
};

/**
 * Mount once at the app root. Announces every toast politely to screen readers
 * and dismisses each one on the app clock, so a frozen demo keeps it visible.
 */
export function Toaster({ clock }: { readonly clock: Clock }) {
  const toasts = useToasts();
  const timers = useRef(new Map<number, () => void>());

  useEffect(() => {
    const live = new Set(toasts.map((toast) => toast.id));
    toasts.forEach((toast) => {
      if (!timers.current.has(toast.id)) {
        timers.current.set(
          toast.id,
          clock.schedule(() => {
            dismissToast(toast.id);
          }, TOAST_VISIBLE_MS),
        );
      }
    });
    timers.current.forEach((cancel, id) => {
      if (!live.has(id)) {
        cancel();
        timers.current.delete(id);
      }
    });
  }, [toasts, clock]);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 layer-toast flex flex-col items-center gap-2 p-4 pt-[max(var(--rh-space-4),env(safe-area-inset-top))]"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.tone];
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => {
              dismissToast(toast.id);
            }}
            className="pointer-events-auto flex max-w-phone animate-toast-in items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-body font-semibold shadow-md"
          >
            <Icon
              {...icon()}
              className={cx(iconTone[toast.tone], toast.tone === "live" && "animate-spin")}
            />
            {toast.message}
          </button>
        );
      })}
    </div>
  );
}
