import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetAllStores } from "../lib/store";

// Lazy sheets and pages are transformed on first import; under a full, parallel run
// that alone can take over the 1 s default. Time in tests is otherwise the demo clock.
configure({ asyncUtilTimeout: 3000 });

afterEach(() => {
  cleanup();
  resetAllStores();
});

// jsdom lacks requestIdleCallback. Never idle here: background warm-ups would import
// modules after a test file's environment is gone. Tests that need it stub their own.
if (typeof window.requestIdleCallback !== "function") {
  window.requestIdleCallback = () => 0;
  window.cancelIdleCallback = () => undefined;
}

// jsdom lacks matchMedia and the modal dialog API; these stand-ins behave like a phone-width browser.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}

if (typeof HTMLDialogElement.prototype.showModal !== "function") {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
