import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Ground Control — Your family mission control.",
  description: "Plan together, stay on track and launch every day.",
  applicationName: "Ground Control",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ground Control",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Ground Control",
    description: "Your family mission control.",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Ground Control — Family life. One place." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ground Control",
    description: "Your family mission control.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2C2255",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
