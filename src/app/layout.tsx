import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentExam — AI-Powered Exam Preparation",
  description:
    "AgentExam is an AI-powered autonomous exam preparation and assessment system: syllabus analysis, PYQ trends, adaptive mock tests, practical and viva simulation, readiness scores and personalized study plans.",
  keywords: ["AgentExam", "AI exam preparation", "mock tests", "viva practice", "study plan", "PYQ analysis"],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "AgentExam — AI-Powered Exam Preparation",
    description: "Your AI examiner for theory and practical university exams.",
    siteName: "AgentExam",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
