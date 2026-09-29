import { createStore, useStore } from "../lib/store";

export interface PresenterState {
  /** Presenter controls are showing. */
  readonly on: boolean;
  /** Desktop only: the app is shown inside a phone-sized frame for screen sharing. */
  readonly frame: boolean;
}

/** Presenter mode. App scope: Reset demo keeps it, so a presenter can reset mid-pitch. */
export const presenterStore = createStore<PresenterState>({ on: false, frame: false }, "app");
export const usePresenter = () => useStore(presenterStore);

export function togglePresenter(): void {
  presenterStore.set((p) => ({ on: !p.on, frame: p.on ? false : p.frame }));
}

export function setPhoneFrame(frame: boolean): void {
  presenterStore.set((p) => ({ ...p, frame }));
}

/** ⌘. or Ctrl-. shows or hides presenter mode. */
export function onPresenterKey(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === ".") {
    event.preventDefault();
    togglePresenter();
  }
}

/** The current address with presenter mode on, inside a frame, for the phone-frame view. */
export function framedUrl(location: Pick<Location, "pathname" | "search">): string {
  const params = new URLSearchParams(location.search);
  params.set("presenter", "1");
  params.set("frame", "1");
  return `${location.pathname}?${params.toString()}`;
}
