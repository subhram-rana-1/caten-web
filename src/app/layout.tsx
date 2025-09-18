import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Caten - English Word Explanation Made Easy with AI",
  description: "AI-powered English word explanation tool that helps you understand difficult words with contextual meanings and examples.",
  keywords: "English, vocabulary, AI, word explanation, learning, education",
  authors: [{ name: "Caten" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}