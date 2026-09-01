"use client";

import { useState } from "react";
import type { TaskQuestion } from "@/lib/data";
import { pickOne } from "@/lib/rng";
import { Btn } from "@/components/ui";

export function Draw({ tasks }: { tasks: TaskQuestion[] }) {
  const [task, setTask] = useState<TaskQuestion | null>(null);

  return (
    <div className="mt-8">
      <Btn
        variant="accent"
        className="px-6 py-3 text-base"
        onClick={() => {
          let next = pickOne(tasks);
          while (tasks.length > 1 && next.id === task?.id) next = pickOne(tasks);
          setTask(next);
        }}
      >
        {task ? "Losuj ponownie" : "Wylosuj zadanie"}
      </Btn>

      {task && (
        <article key={task.id} className="resolve surface mt-6 rounded-md p-6 sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <span className="meta text-ink-faint">
              zadanie {String(task.nr).padStart(2, "0")}
            </span>
            <span className="meta text-amber">{task.time}</span>
          </div>
          <p className="mt-4 text-[1.15rem] leading-relaxed sm:text-[1.3rem]">
            {task.prompt}
          </p>
        </article>
      )}
    </div>
  );
}
