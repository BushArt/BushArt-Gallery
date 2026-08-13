import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/admin/Providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: "500",
});

export const metadata: Metadata = {
  title: "BushArt — Digital Sketchbook & Gallery",
  description: "A minimalist, dark-themed digital art portfolio.",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable}`}
      >
        <Suspense fallback={null}>
          <Providers>
            {children}
            {modal}
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}