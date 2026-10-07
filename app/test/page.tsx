import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/ui";
import TestClient from "./TestClient";

export const metadata: Metadata = {
  title: "Test i arkusz egzaminacyjny — Ostrość",
  description:
    "Arkusz czeladniczy dla optyka okularowego: 49 pytań z 7 działów, po 3 łatwe, 2 średnie i 2 trudne w każdym dziale.",
};

export default function TestPage() {
  return (
    <>
      <SiteHeader current="test" />
      <Suspense>
        <TestClient />
      </Suspense>
    </>
  );
}
