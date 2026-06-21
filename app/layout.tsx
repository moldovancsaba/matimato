import "@doneisbetter/gds-theme/styles.css";
import "./globals.css";

import { ColorSchemeScript } from "@mantine/core";
import type { Metadata, Viewport } from "next";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import PwaGuard from "@/components/PwaGuard";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Matimato",
  description: "A signed-number strategy board game for solo and player-to-player play.",
  manifest: "/manifest.webmanifest",
  applicationName: "Matimato",
  appleWebApp: {
    capable: true,
    title: "Matimato",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#15211f"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <GoogleAnalytics />
        <PwaGuard />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
