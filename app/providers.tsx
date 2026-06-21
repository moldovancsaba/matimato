"use client";

import { GdsProvider, createPublicBrandTheme } from "@doneisbetter/gds/client";

const matimatoTheme = createPublicBrandTheme({
  flatSurfaces: true
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GdsProvider theme={matimatoTheme} defaultColorScheme="dark" forceColorScheme="dark">
      {children}
    </GdsProvider>
  );
}
