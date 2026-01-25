/**
 * Root Layout
 * 
 * Top-level layout wrapping all pages in the application.
 * Defines global fonts, metadata, and HTML structure.
 * Used by: All pages automatically via Next.js App Router.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UpdateNotification from "./components/UpdateNotification";
import WindowControls from "./components/WindowControls";
import TitleBar from "./components/TitleBar";
import AutoLogin from "./components/AutoLogin";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jobelix Desktop - MVP",
  description: "Jobelix Desktop Application - MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TitleBar />
        <WindowControls />
        <AutoLogin />
        {children}
        <UpdateNotification />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
