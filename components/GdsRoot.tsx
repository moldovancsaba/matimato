'use client';

import { GdsProvider } from '@doneisbetter/gds';

export function GdsRoot({ children }: { children: React.ReactNode }) {
  return (
    <GdsProvider defaultColorScheme="dark">
      {children}
    </GdsProvider>
  );
}
