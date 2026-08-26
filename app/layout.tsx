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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Ground Control — Family life. One place.",
  description: "A calm, shared planner and family board for everyday life.",
  applicationName: "Ground Control",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ground Control",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Ground Control",
    description: "Family life. One place.",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Ground Control — Family life. One place." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ground Control",
    description: "Family life. One place.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
        {children}
      </body>
    </html>
  );
}
