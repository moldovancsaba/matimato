import "@doneisbetter/gds-theme/styles.css";
import "./globals.css";

import { ColorSchemeScript } from "@mantine/core";
import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Matimato",
  description: "A signed-number strategy board game for solo and player-to-player play."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
