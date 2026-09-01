import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/ui";
import FiszkiClient from "./FiszkiClient";

export const metadata: Metadata = {
  title: "Fiszki ustne — Ostrość",
  description:
    "Fiszki do części ustnej egzaminu czeladniczego: technologia, materiałoznawstwo, maszynoznawstwo i rysunek zawodowy.",
};

export default function FiszkiPage() {
  return (
    <>
      <SiteHeader current="fiszki" />
      <Suspense>
        <FiszkiClient />
      </Suspense>
    </>
  );
}
