import { lazy, Suspense } from "react";
import { useAccountSheetOpen } from "./account-sheet-store";

const AccountSheet = lazy(async () => ({ default: (await import("./AccountSheet")).AccountSheet }));

/** Mounted once; the sheet and the motion library it needs load on first open. */
export function AccountSheetHost() {
  if (!useAccountSheetOpen()) return null;
  return (
    <Suspense fallback={null}>
      <AccountSheet />
    </Suspense>
  );
}
