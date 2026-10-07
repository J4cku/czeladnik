import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/ui";
import FiszkiClient from "./FiszkiClient";

export const metadata: Metadata = {
  title: "Egzamin ustny i fiszki — Ostrość",
  description:
    "Ćwicz egzamin ustny: 9 pytań, po jednym łatwym, średnim i trudnym z technologii, materiałoznawstwa i maszynoznawstwa. Dostępne także własne talie fiszek.",
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
