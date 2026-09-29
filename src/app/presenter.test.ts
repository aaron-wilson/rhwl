import { describe, expect, it } from "vitest";
import {
  framedUrl,
  onPresenterKey,
  presenterStore,
  setPhoneFrame,
  togglePresenter,
} from "./presenter";

const key = (init: KeyboardEventInit) =>
  new KeyboardEvent("keydown", { cancelable: true, ...init });

describe("presenter mode", () => {
  it("toggles, and leaving it drops the phone frame", () => {
    togglePresenter();
    setPhoneFrame(true);
    expect(presenterStore.get()).toEqual({ on: true, frame: true });
    togglePresenter();
    expect(presenterStore.get()).toEqual({ on: false, frame: false });
  });

  it("answers ⌘. and Ctrl-. only", () => {
    const plain = key({ key: "." });
    onPresenterKey(plain);
    expect(presenterStore.get().on).toBe(false);
    const ctrl = key({ key: ".", ctrlKey: true });
    onPresenterKey(ctrl);
    expect(presenterStore.get().on).toBe(true);
    expect(ctrl.defaultPrevented).toBe(true);
    onPresenterKey(key({ key: ".", metaKey: true }));
    expect(presenterStore.get().on).toBe(false);
  });

  it("frames the current address with presenter mode on", () => {
    expect(framedUrl({ pathname: "/asset/rh-NVDA", search: "?scenario=green-day" })).toBe(
      "/asset/rh-NVDA?scenario=green-day&presenter=1&frame=1",
    );
  });
});
