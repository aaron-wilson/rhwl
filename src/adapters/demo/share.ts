import type { Share, SharePayload } from "../../ports/share";

/** Keeps what was shared instead of opening a share sheet. */
export function createDemoShare(): Share & { readonly shared: readonly SharePayload[] } {
  const shared: SharePayload[] = [];
  return {
    shared,
    share: (payload) => {
      shared.push(payload);
      return Promise.resolve("copied");
    },
  };
}
