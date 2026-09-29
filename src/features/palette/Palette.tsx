import { useId, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { parseAction } from "../../domain/palette/actions";
import { search, type Command } from "../../domain/palette/search";
import { cx } from "../../ui/cx";
import { Sheet } from "../../ui/Sheet";
import { allCommands, assetIdForSymbol } from "./commands";
import { closePalette } from "./palette-store";

/**
 * Type to jump anywhere or change a setting; type "send 20 USDG to you.rh"
 * to open Send filled in. Arrow keys move, Enter runs, Esc closes.
 */
export function Palette() {
  const navigate = useNavigate();
  const commands = useMemo(() => allCommands(), []);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const action = parseAction(query, assetIdForSymbol);
  const results: Command[] = [
    ...(action === undefined
      ? []
      : [
          {
            id: "action",
            title: action.title,
            group: "Action",
            keywords: "",
            run: { kind: "go", to: action.to },
          } as const,
        ]),
    ...search(commands, query),
  ];
  const current = Math.min(active, Math.max(0, results.length - 1));

  function run(command: Command | undefined) {
    if (command === undefined) return;
    closePalette();
    if (command.run.kind === "go") void navigate(command.run.to);
    else if (command.run.kind === "reload") window.location.assign(command.run.to);
    else command.run.apply();
  }

  return (
    <Sheet
      open
      onClose={closePalette}
      title="Go anywhere"
      description="Pages, assets, settings, scenarios and actions"
    >
      <div className="flex flex-col gap-3">
        <input
          role="combobox"
          aria-label="Search commands"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={results.length > 0 ? `${listId}-${current}` : undefined}
          value={query}
          placeholder='Try "NVDA", "dark", or "send 20 USDG to you.rh"'
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive(Math.min(current + 1, results.length - 1));
            else if (e.key === "ArrowUp") setActive(Math.max(current - 1, 0));
            else if (e.key === "Enter") run(results[current]);
            else return;
            e.preventDefault();
          }}
          className="h-12 rounded-md bg-surface-2 px-4 text-body"
        />
        <ul
          id={listId}
          role="listbox"
          aria-label="Results"
          className="flex max-h-64 flex-col overflow-y-auto"
        >
          {results.map((command, i) => (
            <li
              key={command.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === current}
              onPointerMove={() => {
                setActive(i);
              }}
              onClick={() => {
                run(command);
              }}
              className={cx(
                "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-body",
                i === current && "bg-surface-2",
              )}
            >
              <span className="truncate">{command.title}</span>
              <span className="shrink-0 text-footnote text-ink-3">{command.group}</span>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-2 text-body text-ink-2">Nothing matches that.</li>
          )}
        </ul>
      </div>
    </Sheet>
  );
}
