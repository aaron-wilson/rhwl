import { createStore, useStore } from "../lib/store";

export type ToastTone = "neutral" | "success" | "error" | "live";

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
}

/** How long a toast stays up. The Toaster schedules dismissal on the app clock. */
export const TOAST_VISIBLE_MS = 3200;
const MAX_VISIBLE = 3;

const toastStore = createStore<readonly Toast[]>([]);
let nextId = 1;

export function dismissToast(id: number): void {
  toastStore.set((toasts) => toasts.filter((toast) => toast.id !== id));
}

/** Shows a short confirmation. The newest toast sits on top; the oldest drops past three. */
export function showToast(message: string, tone: ToastTone = "neutral"): number {
  const id = nextId;
  nextId += 1;
  toastStore.set((toasts) => [{ id, message, tone }, ...toasts].slice(0, MAX_VISIBLE));
  return id;
}

export function useToasts(): readonly Toast[] {
  return useStore(toastStore);
}
