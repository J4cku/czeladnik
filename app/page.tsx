import { Suspense } from "react";
import { getCatalog } from "@/lib/data";
import { SiteFooter, SiteHeader } from "@/components/ui";
import { Dzialy, StudyLinks } from "./Dzialy";

const apprentice = getCatalog("czeladnik");
const master = getCatalog("mistrz");
const totalCount = apprentice.totalCount + master.totalCount;

const chart = [
  { acuity: "6/60", node: <span className="optotype text-[clamp(2.4rem,11vw,8.5rem)]">Ostrość</span> },
  {
    acuity: "6/24",
    node: (
      <span className="optotype text-[clamp(1.15rem,4.4vw,2.75rem)]">
        {totalCount} pytań i zadań
      </span>
    ),
  },
  {
    acuity: "6/12",
    node: (
      <span className="optotype text-[clamp(0.95rem,2.6vw,1.35rem)] text-ink-soft">
        Czeladnik i Mistrz · optyk okularowy
      </span>
    ),
  },
  {
    acuity: "6/6",
    node: (
      <span className="block max-w-xl text-[15px] leading-relaxed text-ink-soft">
        Złóż arkusz czeladniczy z 49 pytaniami lub mistrzowski z 63 pytaniami,
        ćwicz egzamin ustny z 9 pytaniami i odpowiedzi na fiszkach.
        Zadania praktyczne dotyczą czeladnika. Kolejność pytań i odpowiedzi
        jest inna przy każdym podejściu.
      </span>
    ),
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[46rem] -translate-x-1/2 rounded-full opacity-[0.13] blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, var(--color-flash), transparent)",
            }}
          />
          <div className="relative mx-auto max-w-5xl px-5 pt-12 pb-14 sm:px-8 sm:pt-16">
            <dl className="border-t rule">
              {chart.map((line, i) => (
                <div
                  key={line.acuity}
                  className={`resolve resolve-${i + 1} grid grid-cols-[2.25rem_1fr] items-end gap-x-3 border-b rule py-4 sm:grid-cols-[4.5rem_1fr] sm:gap-x-6`}
                >
                  <dt className="meta pb-1 text-ink-faint">{line.acuity}</dt>
                  <dd>{line.node}</dd>
                </div>
              ))}
            </dl>

            <Suspense><StudyLinks /></Suspense>

            <ul className="meta mt-8 flex flex-wrap gap-x-6 gap-y-2 text-ink-faint">
              <li>{apprentice.totalCount} pytań i zadań · Czeladnik</li>
              <li>{master.totalCount} pytania · Mistrz</li>
              <li>{apprentice.taskQuestions.length} zadań praktycznych · Czeladnik</li>
            </ul>
          </div>
        </section>

        <Suspense><Dzialy /></Suspense>
      </main>

      <SiteFooter />
    </>
  );
}
