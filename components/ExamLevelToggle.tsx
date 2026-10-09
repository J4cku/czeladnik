"use client";

import type { ExamLevel } from "../lib/data";

export function ExamLevelToggle({ level, onChange }: {
  level: ExamLevel;
  onChange: (level: ExamLevel) => void;
}) {
  return (
    <div role="group" aria-label="Poziom egzaminu" className="flex flex-wrap gap-2">
      {([
        { value: "czeladnik", label: "Czeladnik" },
        { value: "mistrz", label: "Mistrz" },
      ] as const).map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={level === value}
          onClick={() => {
            if (value !== level) onChange(value);
          }}
          className={`ui rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
            level === value
              ? "border-ink bg-ink text-paper"
              : "border-ink/20 bg-card text-ink-soft hover:border-ink/45 hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
