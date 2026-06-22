import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Matimato',
    short_name: 'Matimato',
    description: 'A tactical 9x9 number chase.',
    start_url: '/',
    display: 'standalone',
    background_color: '#120811',
    theme_color: '#120811',
    orientation: 'portrait',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }]
  };
}
