import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Literata } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
});

const literata = Literata({
  subsets: ["latin-ext"],
  variable: "--font-literata",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "Ostrość — pytania na egzamin czeladniczy, optyk okularowy",
  description:
    "701 pytań i zadań na egzamin czeladniczy z optyki okularowej. Losowane testy ABC, fiszki do części ustnej i lista zadań praktycznych.",
};

export const viewport: Viewport = {
  themeColor: "#eef1ec",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${archivo.variable} ${literata.variable} ${plex.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
