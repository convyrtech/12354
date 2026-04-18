import type { Metadata } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Manrope } from "next/font/google";
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
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

// Fraunces (72pt optical size) is declared directly via @font-face in
// globals.css with an explicit Latin-only unicode-range so Cyrillic copy
// falls through to Cormorant (--font-display) instead of next/font's
// auto-generated sans fallback.

export const metadata: Metadata = {
  title: "The Raki — раки, краб и морепродукты с private service по Москве",
  description:
    "Раки, камчатский краб и дикие креветки, доставленные вовремя. Своя кухня, свои курьеры, Москва с 2017.",
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
    <html
      lang="ru"
      className={`${manrope.variable} ${cormorant.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
