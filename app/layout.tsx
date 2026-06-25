import type { Metadata, Viewport } from 'next';
import '@doneisbetter/gds-theme/styles.css';
import { GdsRoot } from '@/components/GdsRoot';
import './globals.css';

export const metadata: Metadata = {
  title: 'Matimato',
  description: 'A progressive tactical number chase rebuilt as a Phaser game.',
  appleWebApp: { capable: true, title: 'Matimato', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon.svg', apple: '/icons/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#120811'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><GdsRoot>{children}</GdsRoot></body>
    </html>
  );
}
