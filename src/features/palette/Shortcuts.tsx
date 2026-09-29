import { Sheet } from "../../ui/Sheet";
import { closePalette } from "./palette-store";

const keys: readonly (readonly [string, string])[] = [
  ["⌘ K  or  Ctrl K", "Open the command palette"],
  ["?", "Show these shortcuts"],
  ["↑ ↓", "Move through palette results"],
  ["Enter", "Run the highlighted result"],
  ["Esc", "Close a sheet or the palette"],
  ["← →", "Scrub a chart, or move a slider"],
  ["⌘ .  or  Ctrl .", "Show or hide presenter mode"],
];

/** Every keyboard shortcut in one list. */
export function Shortcuts() {
  return (
    <Sheet open onClose={closePalette} title="Keyboard shortcuts">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
        {keys.map(([key, what]) => (
          <div key={key} className="contents">
            <dt>
              <kbd className="rounded-sm bg-surface-2 px-2 py-1 font-mono text-footnote">{key}</kbd>
            </dt>
            <dd className="text-ink-2">{what}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}
