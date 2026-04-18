import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lana — Tu dinero, claro.",
  description: "Controla tus gastos, entiende tu dinero.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${sora.variable} ${dmSans.variable}`}>
      <body
        className="antialiased"
        style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
