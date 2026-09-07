import type { Metadata, Viewport } from "next";
import { Outfit, IBM_Plex_Mono } from "next/font/google";
import { MARCA } from "@/lib/dominio/marca";
import "./globals.css";

// Gilroy es la fuente de DESIGN.md; no hay licencia en el repo, así que
// se usa el fallback documentado (Outfit). Si aparece Gilroy, va en
// public/fonts/ con next/font/local y se cambia solo aquí.
const sans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: MARCA.nombre, template: `%s · ${MARCA.nombre}` },
  description: MARCA.descripcion,
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={`${sans.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
