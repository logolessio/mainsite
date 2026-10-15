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
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://cdn.discordapp.com https://i.ytimg.com",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  'frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://www.tiktok.com https://www.instagram.com',
  "frame-ancestors 'self' https://logoless.io https://*.logoless.io",
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
    const publicHosts = [{ type: 'host', value: 'logoless.io' }, { type: 'host', value: 'www.logoless.io' }, { type: 'host', value: 'dev.logoless.io' }]
    return [
      // The admin dashboard lives on its own address. Anything that asks for it on another address is sent there.
      ...publicHosts.map((h) => ({ source: '/admin/:path*', has: [h], destination: 'https://owner.logoless.io/admin/:path*', permanent: false })),
      // admin.logoless.io was the first address of the owner area. It only forwards now.
      { source: '/:path*', has: [{ type: 'host', value: 'admin.logoless.io' }], destination: 'https://owner.logoless.io/:path*', permanent: false },
      { source: '/', has: [{ type: 'host', value: 'owner.logoless.io' }], destination: '/admin', permanent: false },
      { source: '/login', has: [{ type: 'host', value: 'owner.logoless.io' }], destination: 'https://logoless.io/login?next=https%3A%2F%2Fowner.logoless.io%2F', permanent: false },
      // The developer dashboard is the front page of the dev site (add ?site=1 to see the site itself).
      { source: '/', has: [{ type: 'host', value: 'dev.logoless.io' }], missing: [{ type: 'query', key: 'site' }], destination: '/dev', permanent: false },
      { source: '/dev/:path*', has: [{ type: 'host', value: 'logoless.io' }], destination: 'https://dev.logoless.io/dev/:path*', permanent: false },
      { source: '/dev/:path*', has: [{ type: 'host', value: 'owner.logoless.io' }], destination: 'https://dev.logoless.io/dev/:path*', permanent: false },
      // Old placeholder pages now live inside the login and forgot-password pages.
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
