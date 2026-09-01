import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/ui";
import TestClient from "./TestClient";

export const metadata: Metadata = {
  title: "Test ABC — Ostrość",
  description:
    "Losowany test jednokrotnego wyboru z pytań na egzamin czeladniczy dla optyka okularowego.",
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
