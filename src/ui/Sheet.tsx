import { useAnimate, type PanInfo } from "motion/react";
import * as m from "motion/react-m";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { instant, spring, tween } from "../tokens/motion";
import { icon } from "./icon";
import { MaxMotion } from "./MaxMotion";
import { useMediaQuery } from "./useMediaQuery";

export interface SheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 600;

const hiddenPose = (wide: boolean) =>
  wide ? { opacity: 0, scale: 0.96, y: 0 } : { opacity: 1, scale: 1, y: "100%" };

/**
 * Bottom sheet on phones, centered dialog on wider screens. Built on the native
 * modal dialog, which makes the rest of the page inert and traps focus.
 */
export function Sheet({ open, onClose, title, description, children }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [panel, animate] = useAnimate<HTMLDivElement>();
  const wide = useMediaQuery("(min-width: 640px)");
  // Imperative animations are outside MotionConfig's reach, and it keeps fades anyway; make them instant here.
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const titleId = useId();

  useEffect(() => {
    const node = dialog.current;
    if (node === null) return;
    if (open && !node.open) {
      delete node.dataset["closing"];
      node.showModal();
      void animate(panel.current, { opacity: 1, scale: 1, y: 0 }, still ? instant : spring.sheet);
    } else if (!open && node.open) {
      node.dataset["closing"] = "";
      void animate(panel.current, hiddenPose(wide), still ? instant : tween("base", "exit")).then(
        () => {
          node.close();
        },
      );
    }
  }, [open, wide, still, animate, panel]);

  function onDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
      onClose();
    } else {
      void animate(panel.current, { y: 0 }, spring.settle);
    }
  }

  return (
    <MaxMotion>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        className="sheet m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-scrim backdrop:backdrop-blur-chrome sm:open:flex sm:items-center sm:justify-center"
      >
        <m.div
          ref={panel}
          initial={hiddenPose(wide)}
          drag={wide ? false : "y"}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={onDragEnd}
          className="absolute inset-x-0 bottom-0 flex max-h-full flex-col rounded-t-xl bg-surface pb-6 shadow-lg sm:relative sm:w-full sm:max-w-sheet sm:rounded-xl"
        >
          <div className="flex justify-center pt-2 pb-1 sm:hidden" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-line-strong" />
          </div>
          <header className="flex items-start gap-3 px-6 pt-3 pb-4 sm:pt-6">
            <div className="flex flex-1 flex-col">
              <h2 id={titleId} className="text-title3 font-semibold">
                {title}
              </h2>
              {description !== undefined && (
                <p className="text-footnote text-ink-3">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-ink-2"
            >
              <X {...icon("sm")} />
            </button>
          </header>
          <div className="overflow-y-auto px-6">{children}</div>
        </m.div>
      </dialog>
    </MaxMotion>
  );
}
