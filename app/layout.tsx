import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display_SC, Kalnia } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplaySC = Playfair_Display_SC({
  variable: "--font-playfair-display-sc",
  subsets: ["latin"],
  weight: "700",
});

const kalnia = Kalnia({
  variable: "--font-kalnia",
  subsets: ["latin"],
  weight: "700",
});

export const metadata: Metadata = {
  title: "Brivia Eats",
  description: "Menu empowered by Brivia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplaySC.variable} ${kalnia.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
