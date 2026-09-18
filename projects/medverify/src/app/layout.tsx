import type { Metadata } from "next";
import { Fraunces, DM_Mono } from "next/font/google";
import { RoleProvider } from "@/components/RoleContext";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces-face",
  subsets: ["latin"],
  weight: ["300", "600"],
  style: ["normal", "italic"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono-face",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MedVerify — Pharmaceutical Supply Chain Tracker",
  description: "Track every pharmaceutical batch, end to end, on the XRP Ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmMono.variable}`}>
      <body className="min-h-screen">
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
