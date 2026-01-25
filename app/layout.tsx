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
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  defaultOpenGraphImages,
  defaultTwitterImages,
  getSiteUrl,
} from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const verification = {
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : {}),
  ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION
    ? { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION }
    : {}),
  ...(process.env.NEXT_PUBLIC_YAHOO_SITE_VERIFICATION
    ? { yahoo: process.env.NEXT_PUBLIC_YAHOO_SITE_VERIFICATION }
    : {}),
  ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
    ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
    : {}),
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} - ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Jobelix",
    "AI job matching",
    "job search automation",
    "LinkedIn auto apply",
    "career platform",
    "job applications",
  ],
  verification,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    images: defaultOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    images: defaultTwitterImages(),
  },
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
