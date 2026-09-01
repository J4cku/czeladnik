import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/ui";
import { taskQuestions } from "@/lib/data";
import { Draw } from "./Draw";

export const metadata: Metadata = {
  title: "Zadania praktyczne — Ostrość",
  description:
    "Wszystkie zadania na część praktyczną egzaminu czeladniczego dla optyka okularowego wraz z czasem wykonania.",
};

export default function ZadaniaPage() {
  return (
    <>
      <SiteHeader current="zadania" />

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <p className="meta text-ink-faint">Część praktyczna</p>
        <h1 className="optotype mt-3 text-4xl sm:text-5xl">
          {taskQuestions.length} zadań
        </h1>
        <p className="mt-4 max-w-xl text-ink-soft">
          Na egzaminie dostajesz jedno zadanie i wyznaczony czas. Wylosuj sobie
          jedno i przećwicz je od recepty po kontrolę gotowych okularów.
        </p>

        <Draw tasks={taskQuestions} />

        <section className="mt-16">
          <p className="meta text-ink-faint">Pełna lista</p>
          <ol className="mt-5 border-t rule">
            {taskQuestions.map((task) => (
              <li
                key={task.id}
                className="grid grid-cols-[2rem_1fr] gap-x-4 border-b rule py-4 sm:grid-cols-[2.5rem_1fr_5rem]"
              >
                <span className="meta pt-1 text-ink-faint">
                  {String(task.nr).padStart(2, "0")}
                </span>
                <p className="text-[15px] leading-relaxed">{task.prompt}</p>
                <span className="meta col-start-2 pt-1 text-amber sm:col-start-3 sm:text-right">
                  {task.time}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
