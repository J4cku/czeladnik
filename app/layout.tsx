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
  title: "Ostrość — egzamin czeladniczy i mistrzowski, optyk okularowy",
  description:
    "1585 pytań i zadań na egzamin czeladniczy i mistrzowski z optyki okularowej. Arkusze z 49 lub 63 pytaniami, egzamin ustny, fiszki i zadania praktyczne dla czeladnika.",
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
