import { Search } from "lucide-react";
import { icon } from "../../ui/icon";
import { openPalette } from "./palette-store";

/** Opens the command palette for people without a keyboard shortcut to hand. */
export function SearchButton() {
  return (
    <button
      type="button"
      aria-label="Search (⌘K)"
      onClick={openPalette}
      className="flex size-10 items-center justify-center rounded-full text-ink-2"
    >
      <Search {...icon()} />
    </button>
  );
}
