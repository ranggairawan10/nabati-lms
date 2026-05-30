import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Source_Sans_3({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});
const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Learning | ONE GLOBAL HCMS",
  description: "Modul pembelajaran ONE GLOBAL HCMS - Nabati Group",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
