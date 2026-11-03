import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProofPay — AI-gated milestone payouts",
  description:
    "Escrow-funded freelance milestones with AI acceptance checklists, AI proof evaluation, and human-in-the-loop approval. Sandbox payments only.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased text-neutral-900`}>
        {children}
      </body>
    </html>
  );
}
