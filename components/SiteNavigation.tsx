"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { normalizeLevel } from "../lib/exam-level";

export function SiteNavigation({ current, children }: {
  current?: "test" | "fiszki" | "zadania";
  children: ReactNode;
}) {
  const params = useSearchParams();
  const level = normalizeLevel(params.get("poziom"));
  const nav = [
    { href: `/test?poziom=${level}`, key: "test", label: "Test ABC" },
    { href: `/fiszki?poziom=${level}`, key: "fiszki", label: "Fiszki" },
    { href: "/zadania", key: "zadania", label: "Zadania" },
  ] as const;
  return (
    <>
      <Link href={`/?poziom=${level}`} className="flex items-center gap-2.5">{children}</Link>
      <nav className="flex items-center gap-1" aria-label="Nawigacja główna">
        {nav.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={current === item.key ? "page" : undefined}
            className={`ui rounded-full px-2.5 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors sm:px-3 sm:text-[13px] ${
              current === item.key ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/[0.06] hover:text-ink"
            }`}
          >{item.label}</Link>
        ))}
      </nav>
    </>
  );
}
