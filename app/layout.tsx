import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter carries all body/UI text — legible at small sizes on cheap Android
// screens, which is the actual reason it's here (Part 6 §2.1). Satoshi
// (display-only, headlines) gets self-hosted when the marketing site is
// built in Month 2 of the execution plan — not needed for this scaffold.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopLocal — a real online store for your business",
  description:
    "A shared ecommerce platform that gives local businesses in Ghana a professional online store, built for how their category actually sells.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
