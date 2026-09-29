/** One thing the palette can do: go somewhere, or change a setting. */
export interface Command {
  readonly id: string;
  readonly title: string;
  /** "Page", "Asset", "Setting", "Scenario", "Action": shown beside the title. */
  readonly group: string;
  /** Extra words that should find it. */
  readonly keywords: string;
  readonly run:
    | { readonly kind: "go"; readonly to: string }
    | { readonly kind: "reload"; readonly to: string }
    | { readonly kind: "set"; readonly apply: () => void };
}

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9$.]+/)
    .filter(Boolean);

/**
 * How well a command matches a query: every query word must start a word of
 * the title or keywords. Title matches beat keyword matches, and a match at the
 * start of the title beats one later on. Zero means no match.
 */
export function score(command: Command, query: string): number {
  const asked = words(query);
  if (asked.length === 0) return 1;
  const title = words(command.title);
  const extra = words(`${command.group} ${command.keywords}`);
  let total = 0;
  for (const word of asked) {
    const at = title.findIndex((t) => t.startsWith(word));
    if (at >= 0) total += at === 0 ? 4 : 3;
    else if (extra.some((t) => t.startsWith(word))) total += 1;
    else return 0;
  }
  return total;
}

/** The matching commands, best first, then in their given order. */
export function search(commands: readonly Command[], query: string, limit = 12): Command[] {
  return commands
    .map((command, index) => ({ command, index, s: score(command, query) }))
    .filter((m) => m.s > 0)
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .slice(0, limit)
    .map((m) => m.command);
}
