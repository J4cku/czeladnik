import { difficultyLabel, type Difficulty } from "../lib/data";

export function QuestionMeta({
  category,
  difficulty,
}: {
  category?: string;
  difficulty?: Difficulty;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="meta text-ink-faint">{category}</p>
      {difficulty && <span className="meta text-amber">{difficultyLabel[difficulty]}</span>}
    </div>
  );
}
