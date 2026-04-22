import type { Metadata } from "next";
import { Geist_Mono, Playfair_Display_SC, Playfair_Display, DM_Sans, Kalnia } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplaySC = Playfair_Display_SC({
  variable: "--font-playfair-display-sc",
  subsets: ["latin"],
  weight: "700",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
        className={`${geistMono.variable} ${playfairDisplaySC.variable} ${playfairDisplay.variable} ${dmSans.variable} ${kalnia.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
