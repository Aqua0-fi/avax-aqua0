import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { AlphaBackground } from "@/components/alpha-background";
import { Providers } from "@/components/providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Aqua0 — Avalanche Edition",
  description:
    "Cross-margin prime brokerage for LATAM stablecoins. One deposit. Every market. Built as a Uniswap V4 hook on Avalanche.",
  icons: {
    icon: "/Aqua0.png",
    shortcut: "/Aqua0.png",
    apple: "/Aqua0.png",
  },
  openGraph: {
    title: "Aqua0 — Avalanche Edition",
    description:
      "One deposit. Every LATAM-stable market. Uniswap V4 hook on Avalanche.",
    images: ["/Aqua0.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="relative min-h-[100dvh] font-sans antialiased">
        {/* Ambient pointillism canvas — fixed to the viewport, sits at
            z-0 behind every page surface. */}
        <AlphaBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
