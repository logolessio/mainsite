import { homedir } from 'node:os'
import { join } from 'node:path'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

// Lets `next dev` use the same bindings (the D1 database) that the deployed Worker has, stored locally in .wrangler.
// The local test database lives outside the project folder. Inside it, every database write (and the site now writes a
// log row on every page view) looked like a file change to the dev server, which reloaded the page forever.
initOpenNextCloudflareForDev({ persist: { path: join(homedir(), '.logoless-dev-db', 'v3') } })

const isProd = process.env.NODE_ENV === 'production'

// Content Security Policy. Next.js needs inline scripts and styles for its own bootstrapping, so those are allowed;
// everything else is restricted to this site plus the few services we actually use (Cloudflare Turnstile).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://connect-js.stripe.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://cdn.discordapp.com https://*.stripe.com https://i.ytimg.com",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com https://api.stripe.com https://*.stripe.com",
  'frame-src https://challenges.cloudflare.com https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com https://www.youtube-nocookie.com https://www.youtube.com https://www.tiktok.com https://www.instagram.com',
  "frame-ancestors 'self'",
  "form-action 'self' https://accounts.google.com https://discord.com",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  ...(isProd ? [{ key: 'Content-Security-Policy', value: csp }] : []),
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Private areas and every API answer are never stored by browsers or shared caches.
      { source: '/(dashboard|brand|admin|onboarding)/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ]
  },
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion'] },
  async rewrites() {
    // logoless.io/@name is the public profile page
    return [{ source: '/@:handle', destination: '/u/:handle' }]
  },
  async redirects() {
    // Old placeholder pages now live inside the login and forgot-password pages.
    return [
      { source: '/campaigns', destination: '/', permanent: true },
      // Pages that were folded into simpler ones.
      { source: '/how-it-works', destination: '/for-clippers', permanent: true },
      { source: '/payouts', destination: '/pricing', permanent: true },
      { source: '/trust', destination: '/faq', permanent: true },
      { source: '/careers', destination: '/contact', permanent: true },
      { source: '/welcome', destination: '/about', permanent: true },
      { source: '/reset-password', destination: '/forgot-password', permanent: true },
      { source: '/verify-email', destination: '/login', permanent: true },
    ]
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
