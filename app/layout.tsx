import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ArbiSafe — Simulate Before You Ape",
  description: "AI-powered DeFi strategy simulator on Arbitrum. Get real swap quotes, stress tests, and protocol trust scores before risking real money.",
  icons: {
    icon: '/logo.png',
  },
  openGraph: {
    title: "ArbiSafe — Simulate Before You Ape",
    description: "AI-powered DeFi strategy simulator on Arbitrum",
    images: [{ url: "https://arbisafe.vercel.app/logo.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
