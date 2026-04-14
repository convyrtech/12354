import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Raki — свежие раки и краб с private service по Москве",
  description:
    "The Raki — premium seafood delivery brand: свежие раки, краб, точная подача и private service по Москве и МО.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} ${cormorant.variable}`}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
