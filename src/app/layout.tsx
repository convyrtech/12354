import type { Metadata } from "next";
import { Cormorant_Garamond, Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
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

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-poster",
  display: "swap",
});

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
      className={`${manrope.variable} ${cormorant.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
