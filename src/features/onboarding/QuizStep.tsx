import { useMemo, useState } from "react";
import { quizFor } from "../../domain/keys/quiz";
import { Button } from "../../ui/Button";

export function QuizStep({
  phrase,
  onPassed,
  onBack,
}: {
  readonly phrase: readonly string[];
  readonly onPassed: () => void;
  readonly onBack: () => void;
}) {
  const quiz = useMemo(() => quizFor(phrase), [phrase]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [failed, setFailed] = useState(false);
  const complete = quiz.every((q) => answers[q.position] !== undefined);

  return (
    <form
      className="flex flex-col gap-6 pt-16"
      onSubmit={(event) => {
        event.preventDefault();
        const correct = quiz.every((q) => answers[q.position] === phrase[q.position]);
        if (correct) onPassed();
        else {
          setFailed(true);
          setAnswers({});
        }
      }}
    >
      <h1 className="text-title1 font-bold">Check your backup</h1>
      {quiz.map((q) => (
        <fieldset key={q.position} className="flex flex-col gap-2">
          <legend className="pb-2 text-headline font-semibold">Word #{q.position + 1}</legend>
          <div className="grid grid-cols-2 gap-2">
            {q.choices.map((choice) => (
              <label
                key={choice}
                className="flex h-12 cursor-pointer items-center justify-center rounded-md border border-line has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-focus"
              >
                <input
                  type="radio"
                  name={`word-${q.position}`}
                  value={choice}
                  checked={answers[q.position] === choice}
                  onChange={() => {
                    setAnswers((prev) => ({ ...prev, [q.position]: choice }));
                  }}
                  className="sr-only"
                />
                {choice}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <p role="alert" className="text-footnote text-loss">
        {failed ? "That doesn't match your phrase. Check your backup and try again." : ""}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="lg" onClick={onBack}>
          Show again
        </Button>
        <Button type="submit" size="lg" block disabled={!complete}>
          Confirm
        </Button>
      </div>
    </form>
  );
}
