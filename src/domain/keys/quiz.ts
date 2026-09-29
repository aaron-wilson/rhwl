import { createRandom } from "../../lib/prng";

/** Three positions, each with four choices from the phrase itself. Seeded, so tests are stable. */
export function quizFor(phrase: readonly string[]): { position: number; choices: string[] }[] {
  const random = createRandom(`quiz:${phrase.join(" ")}`);
  const positions = new Set<number>();
  while (positions.size < 3) positions.add(Math.floor(random() * phrase.length));
  return [...positions]
    .sort((a, b) => a - b)
    .map((position) => {
      const answer = phrase[position] ?? "";
      const others = phrase.filter((word) => word !== answer);
      const choices = new Set([answer]);
      while (choices.size < 4 && choices.size <= others.length) {
        choices.add(others[Math.floor(random() * others.length)] ?? answer);
      }
      return { position, choices: [...choices].sort() };
    });
}
