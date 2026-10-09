import type { OpenQuestion } from "@/lib/data";
import { Eyebrow } from "./ui";

export function QuestionAnswer({ question }: { question: Pick<OpenQuestion, "answer" | "explanation"> }) {
  return (
    <div>
      <Eyebrow>Odpowiedź źródłowa</Eyebrow>
      <p className="mt-3 whitespace-pre-wrap text-[15.5px] leading-relaxed sm:text-base">
        {question.answer}
      </p>
      {question.explanation && (
        <details className="mt-5 border-t rule pt-4">
          <summary className="ui cursor-pointer text-sm font-semibold text-ink-soft">
            Objaśnienie z arkusza
          </summary>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">
            {question.explanation}
          </p>
        </details>
      )}
    </div>
  );
}
