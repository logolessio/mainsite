import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

// Lets `next dev` use the same bindings (the D1 database) that the deployed Worker has, stored locally in .wrangler.
initOpenNextCloudflareForDev()

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion'] },
  async rewrites() {
    // logoless.io/@name is the public profile page
    return [{ source: '/@:handle', destination: '/u/:handle' }]
  },
  async redirects() {
    return [{ source: '/campaigns', destination: '/', permanent: true }]
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
