import {
  abcQuestions,
  categories,
  openQuestions,
  taskQuestions,
  totalCount,
} from "@/lib/data";
import { LinkBtn, SiteFooter, SiteHeader } from "@/components/ui";
import { Dzialy } from "./Dzialy";
import { ProgressStrip } from "./ProgressStrip";

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
        Egzamin czeladniczy · optyk okularowy
      </span>
    ),
  },
  {
    acuity: "6/6",
    node: (
      <span className="block max-w-xl text-[15px] leading-relaxed text-ink-soft">
        Złóż arkusz z 49 pytaniami albo własny zestaw, ćwicz egzamin ustny
        z 9 pytaniami i odpowiedzi na fiszkach, przeglądaj zadania praktyczne. Kolejność pytań i odpowiedzi
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

            <div className="resolve resolve-4 mt-8 flex flex-wrap items-center gap-3">
              <LinkBtn href="/test" variant="accent" className="px-6 py-3 text-base">
                Losuj test ABC
              </LinkBtn>
              <LinkBtn href="/test?arkusz=1" variant="ghost">
                Arkusz egzaminacyjny
              </LinkBtn>
              <LinkBtn href="/fiszki" variant="ghost">
                Fiszki ustne
              </LinkBtn>
              <LinkBtn href="/fiszki?egzamin=1" variant="ghost">
                Egzamin ustny · 9 pytań
              </LinkBtn>
              <LinkBtn href="/zadania" variant="ghost">
                Zadania praktyczne
              </LinkBtn>
            </div>

            <ul className="meta mt-8 flex flex-wrap gap-x-6 gap-y-2 text-ink-faint">
              <li>{abcQuestions.length} pytań ABC</li>
              <li>{openQuestions.length} pytań opisowych</li>
              <li>{taskQuestions.length} zadań praktycznych</li>
              <li>{categories.length} działów</li>
            </ul>
          </div>
        </section>

        <ProgressStrip />
        <Dzialy />
      </main>

      <SiteFooter />
    </>
  );
}
