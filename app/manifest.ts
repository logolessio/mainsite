import type { MetadataRoute } from 'next'

/** Lets people add logoless to their phone's home screen so it opens like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'logoless',
    short_name: 'logoless',
    description: 'Clip campaigns from artists, streamers and brands. Post the clip, get paid for every thousand views.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
