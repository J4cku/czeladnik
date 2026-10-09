import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Suspense } from "react";
import { SiteNavigation } from "./SiteNavigation";
import { StorageNotice } from "./StorageNotice";

/** The duochrome target: red on one side, green on the other. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <circle cx="16" cy="16" r="15" fill="var(--color-ink)" />
      <path d="M16 4a12 12 0 0 0 0 24z" fill="var(--color-duo-red)" />
      <path d="M16 4a12 12 0 0 1 0 24z" fill="var(--color-duo-green)" />
      <circle cx="16" cy="16" r="4" fill="var(--color-ink)" />
    </svg>
  );
}

const variants = {
  solid: "bg-ink text-paper hover:bg-ink/85",
  accent: "bg-flash text-white hover:bg-flash/88",
  ghost:
    "bg-card text-ink border border-ink/15 hover:border-ink/40 hover:bg-ink/[0.03]",
  quiet: "text-ink-soft hover:text-ink",
} as const;

export type Variant = keyof typeof variants;

export function btnClass(variant: Variant = "solid", extra = "") {
  const base =
    "ui inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none";
  return `${base} ${variants[variant]} ${extra}`;
}

export function Btn({
  variant = "solid",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={btnClass(variant, className)} />;
}

export function LinkBtn({
  variant = "solid",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={btnClass(variant, className)} />;
}

export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`meta text-ink-faint ${className}`}>{children}</p>;
}

export function SiteHeader({ current }: { current?: "test" | "fiszki" | "zadania" }) {
  return (
    <header className="border-b rule">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Suspense>
          <SiteNavigation current={current}>
            <Mark />
            <span className="ui text-[14px] font-bold tracking-[0.12em] uppercase sm:text-[15px] sm:tracking-[0.16em]">
              Ostrość
            </span>
          </SiteNavigation>
        </Suspense>
      </div>
      <StorageNotice />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t rule">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-[13px] text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          Pytania pochodzą z końcowych arkuszy egzaminu czeladniczego i mistrzowskiego —
          optyk okularowy. Zadania praktyczne dotyczą czeladnika.
        </p>
        <p className="meta">Postępy zapisują się w tej przeglądarce</p>
      </div>
    </footer>
  );
}
